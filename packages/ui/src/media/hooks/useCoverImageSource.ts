'use client';
import { useCallback, useMemo, useState } from 'react';

/** Which URL a cover well should paint, and what to do when it will not load. */
export type CoverImageSource = {
  /** The URL to put in `src`, or null when there is nothing paintable. */
  src: string | null;
  /** True when every candidate was tried and none of them loaded. */
  broken: boolean;
  /** Hand to the `<img>`'s `onError` so the next candidate is tried. */
  onError: () => void;
};

/**
 * Picks the URL a cover well shows, and survives one of them being dead.
 *
 * WHY THIS IS NOT JUST `preview ?? value`
 * A cover has two possible sources at once — the local object URL of the file
 * the vendor just picked, and the stored URL that lands when the upload
 * finishes — and the local one is the more fragile of the two. An object URL is
 * scoped to the document that minted it and is revoked on unmount, so a field
 * that prefers it unconditionally can end up pinned to a handle that no longer
 * resolves, showing nothing at all while the very same image renders fine
 * everywhere else on the page from the stored URL.
 *
 * That is not hypothetical: it is exactly the shape of the bug this replaces —
 * a package cover that appeared in the "What clients will see" preview, which
 * reads the stored URL, and never in the field beside it, which was still
 * holding the local one.
 *
 * So the sources are a LIST, tried in order, and a source that fails to decode
 * is struck off rather than stared at. `alt=""` is right for a decorative cover
 * but it means a broken image renders as literally nothing — invisible, with no
 * broken-image glyph to hint at what went wrong — so falling through has to
 * happen in state, where the field can also say so.
 */
export function useCoverImageSource(
  preview: string | null | undefined,
  value: string | null | undefined,
): CoverImageSource {
  const [failed, setFailed] = useState<string[]>([]);

  const candidates = useMemo(
    () => [preview, value].filter((url): url is string => Boolean(url)),
    [preview, value],
  );

  const src = candidates.find((url) => !failed.includes(url)) ?? null;

  const onError = useCallback(() => {
    // Guarded rather than appended blindly: a src that errors while already
    // recorded would otherwise grow the list on every re-render.
    if (src) setFailed((current) => (current.includes(src) ? current : [...current, src]));
  }, [src]);

  return { src, broken: src === null && candidates.length > 0, onError };
}
