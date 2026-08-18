'use client';
import { useEffect, useState } from 'react';

/**
 * Which section heading is currently being read.
 *
 * Watches the headings themselves through one `IntersectionObserver` rather
 * than measuring offsets on every scroll event: the observer fires only when a
 * heading actually crosses the band, so a 40-section document costs nothing to
 * follow while the user scrolls.
 *
 * The `rootMargin` is what makes it feel right. It collapses the viewport to a
 * band just under the sticky header, so "active" means the heading whose
 * content fills the top of the screen — not whichever heading happens to be
 * visible anywhere, which on a long page is usually several at once and picks
 * the wrong one.
 */
export function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // Document order, not intersection order: entries arrive in whatever
        // order they changed, and the first heading in the band is the one the
        // reader is under.
        const first = ids.find((id) => visible.has(id));
        if (first) setActive(first);
      },
      { rootMargin: '-88px 0px -70% 0px', threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}
