import type { MediaRecord, MediaSource, PlayableMedia } from '../types';

/**
 * Deciding what a stored media URL actually is, and refusing the ones we must
 * not render.
 *
 * This is the security boundary of the kit. A `vendor_media` row's URL is
 * vendor-supplied — the portal still accepts a pasted link alongside an upload —
 * so nothing here trusts `media_type` to describe what it will find at the other
 * end. Only two hosts are ever framed, and only http(s) survives at all, which
 * is what keeps a `javascript:` or `data:` URL out of an `<img src>`, a
 * `<video src>` and an `<iframe src>` alike.
 */

const VIDEO_FILE_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v', '.ogv', '.ogg'];

/**
 * Parse, and reject any scheme that isn't plain web traffic.
 *
 * The base is only needed to resolve a relative URL, and `window` is absent
 * during a server render — so it falls back to a syntactically valid origin that
 * cannot match either embed host, meaning a relative URL degrades to `external`
 * rather than throwing.
 */
function toUrl(raw: string): URL | null {
  const base = typeof window === 'undefined' ? 'https://localhost' : window.location.origin;
  try {
    const url = new URL(raw, base);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

function host(url: URL): string {
  return url.hostname.replace(/^www\./, '').toLowerCase();
}

/** The video id from any of YouTube's URL shapes, or null if it isn't one. */
function youTubeId(url: URL): string | null {
  const h = host(url);
  if (h === 'youtu.be') return url.pathname.slice(1).split('/')[0] || null;
  if (h !== 'youtube.com' && h !== 'm.youtube.com' && h !== 'youtube-nocookie.com') return null;
  if (url.pathname === '/watch') return url.searchParams.get('v');
  return url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/)?.[1] ?? null;
}

/** The numeric id from a Vimeo page or player URL, or null if it isn't one. */
function vimeoId(url: URL): string | null {
  const h = host(url);
  if (h !== 'vimeo.com' && h !== 'player.vimeo.com') return null;
  return url.pathname.match(/(\d+)/)?.[1] ?? null;
}

function hasVideoExtension(url: URL): boolean {
  const path = url.pathname.toLowerCase();
  return VIDEO_FILE_EXTENSIONS.some((ext) => path.endsWith(ext));
}

/**
 * Classifies one row for rendering. Only YouTube and Vimeo are ever framed — an
 * unrecognised host is linked out to rather than embedded, so a pasted URL can't
 * put an arbitrary third-party document inside the app's chrome.
 */
export function resolveMediaSource(item: MediaRecord): MediaSource | null {
  if (!item.url) return null;
  const url = toUrl(item.url);
  if (!url) return null;

  if (item.media_type === 'image') return { kind: 'image', src: url.href };

  const youtube = youTubeId(url);
  if (youtube)
    return { kind: 'video-embed', src: `https://www.youtube-nocookie.com/embed/${youtube}` };

  const vimeo = vimeoId(url);
  if (vimeo) return { kind: 'video-embed', src: `https://player.vimeo.com/video/${vimeo}` };

  if (hasVideoExtension(url)) return { kind: 'video-file', src: url.href };

  return { kind: 'external', src: url.href };
}

/**
 * Drops the rows that can't be shown (no URL, unusable protocol) and attaches
 * each survivor's resolved source, so every consumer downstream — grid, tile,
 * thumbnail strip and viewer — works off one already-decided list and their
 * indexes agree with each other.
 */
export function toPlayableMedia<T extends MediaRecord>(items: T[]): PlayableMedia<T>[] {
  return items.flatMap((item) => {
    const source = resolveMediaSource(item);
    return source && item.url ? [{ ...item, url: item.url, source }] : [];
  });
}

/**
 * A still to represent an item in a grid or a thumbnail strip. YouTube publishes
 * one per video; everything else has no server-side thumbnail, so the caller
 * falls back to rendering the media itself (or a placeholder for embeds it can't
 * preview).
 */
export function posterUrl(source: MediaSource): string | null {
  if (source.kind === 'image') return source.src;
  const youtube =
    source.kind === 'video-embed' ? source.src.match(/\/embed\/([^/?#]+)/)?.[1] : null;
  return youtube ? `https://i.ytimg.com/vi/${youtube}/hqdefault.jpg` : null;
}

/** Whether an item should be presented as a video (play badge, "Play" label). */
export function isVideoSource(source: MediaSource): boolean {
  return source.kind !== 'image';
}
