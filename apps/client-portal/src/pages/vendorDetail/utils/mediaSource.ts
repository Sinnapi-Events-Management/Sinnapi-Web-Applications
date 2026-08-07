import type { VendorMediaModel } from '@/lib/types';

/**
 * How a portfolio item can be shown. `media_type` alone isn't enough to decide:
 * the vendor portal still lets vendors paste an arbitrary URL rather than upload
 * to the `vendor-videos` bucket, so a row typed `video` may hold a direct file,
 * a YouTube/Vimeo page, or something we can't render inline at all.
 */
export type MediaSource =
  | { kind: 'image'; src: string }
  /** A real video file — plays in a native <video> element. */
  | { kind: 'video-file'; src: string }
  /** A YouTube/Vimeo page, rewritten to its player URL for an <iframe>. */
  | { kind: 'video-embed'; src: string }
  /** Renderable by nobody here; offered as an outbound link instead. */
  | { kind: 'external'; src: string };

/** A media row we can actually put on screen. */
export type PlayableMedia = VendorMediaModel & { url: string; source: MediaSource };

const VIDEO_FILE_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v', '.ogv', '.ogg'];

function toUrl(raw: string): URL | null {
  try {
    const url = new URL(raw, window.location.origin);
    // Anything that isn't plain web traffic (javascript:, data:, blob:) never
    // reaches an <img src>, a <video src> or an <iframe src>.
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
 * Classifies one row for rendering. Only YouTube and Vimeo are ever framed —
 * an unrecognised host is linked out to rather than embedded, so a pasted URL
 * can't put an arbitrary third-party document inside the app's chrome.
 */
export function resolveMediaSource(item: VendorMediaModel): MediaSource | null {
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
 * each survivor's resolved source, so every consumer downstream — grid, tile and
 * lightbox — works off one already-decided list and indexes agree between them.
 */
export function toPlayableMedia(items: VendorMediaModel[]): PlayableMedia[] {
  return items.flatMap((item) => {
    const source = resolveMediaSource(item);
    return source && item.url ? [{ ...item, url: item.url, source }] : [];
  });
}

/**
 * A still to represent an item in the grid. YouTube publishes one per video;
 * everything else has no server-side thumbnail, so the tile falls back to
 * rendering the media itself (or a placeholder for embeds we can't preview).
 */
export function posterUrl(source: MediaSource): string | null {
  if (source.kind === 'image') return source.src;
  const youtube =
    source.kind === 'video-embed' ? source.src.match(/\/embed\/([^/?#]+)/)?.[1] : null;
  return youtube ? `https://i.ytimg.com/vi/${youtube}/hqdefault.jpg` : null;
}
