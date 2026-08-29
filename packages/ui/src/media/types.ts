/**
 * The media kit's vocabulary.
 *
 * Deliberately structural rather than tied to `vendor_media`: the kit is shared
 * by the client portal (which reads a public vendor's portfolio) and the vendor
 * portal (which curates its own), and those two apps generate their row types
 * independently. Everything below is expressed as the *minimum* shape a row must
 * have, and the generics carry each app's own extra columns through untouched —
 * so the vendor portal's `is_primary` and `sort_order` survive the trip into a
 * tile's overlay without the kit ever having heard of them.
 */

/** The columns any media row must expose for this kit to render it. */
export type MediaRecord = {
  id: string;
  /** `'image' | 'video'` in practice, but a plain string in every app's row type. */
  media_type: string;
  url: string | null;
  caption: string | null;
};

/**
 * How a row can actually be put on screen. `media_type` alone isn't enough to
 * decide: a row typed `video` may hold a direct file, a YouTube/Vimeo page, or
 * something no element here can render.
 */
export type MediaSource =
  | { kind: 'image'; src: string }
  /** A real video file — plays in a native <video> element. */
  | { kind: 'video-file'; src: string }
  /** A YouTube/Vimeo page, rewritten to its player URL for an <iframe>. */
  | { kind: 'video-embed'; src: string }
  /** Renderable by nobody here; offered as an outbound link instead. */
  | { kind: 'external'; src: string };

/**
 * A row we can put on screen, with its source already decided.
 *
 * `T` is the caller's own row type, so a consumer that hands in richer rows gets
 * richer rows back out of `toPlayableMedia` and can read its own columns in the
 * render slots this kit exposes.
 */
export type PlayableMedia<T extends MediaRecord = MediaRecord> = T & {
  url: string;
  source: MediaSource;
};
