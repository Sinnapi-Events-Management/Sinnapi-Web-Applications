'use client';
import { useEffect, useState } from 'react';

/**
 * The height of the public navbar, in pixels, as it is actually rendered.
 *
 * Anything that pins itself below the header needs this number, and the header
 * is a two-tier bar — a utility strip whose contents change at `lg` sitting on
 * top of a toolbar — so the number is neither constant across breakpoints nor
 * safe to hard-code. Measuring it means a change to the navbar cannot silently
 * leave a sticky element tucked underneath it.
 *
 * Starts at 0 so the first server-rendered paint matches the client's, then
 * settles on the real value after mount. A `ResizeObserver` keeps it right
 * through rotation, resize and the navbar's own transitions.
 */
export function useStickyHeaderOffset() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>('header.MuiAppBar-root');
    if (!header) return;

    const measure = () => setOffset(header.offsetHeight);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return offset;
}
