'use client';
import { useEffect, useState } from 'react';
import { STICKY_CTA_ATTR } from '@/lib/stickyCta';

/**
 * Below `md`, matching the breakpoint at which the sidebar card stops being a
 * sticky column and the bar takes over. Written as a media query string rather
 * than read from the theme because `matchMedia` is the thing listening, and
 * `useMediaQuery` would re-render the tree on every resize tick to tell us
 * something CSS already knows.
 */
const COMPACT = '(max-width: 899.95px)';

/**
 * Whether the fixed action bar should be up.
 *
 * True when the viewport is compact and the sidebar card's own buttons are not
 * on screen — which, with the card now sitting *after* the tabs on a phone,
 * means from the moment the page opens until the reader scrolls all the way
 * down to it. It then retracts while the card is in view and returns once the
 * card has passed.
 *
 * Earlier this was the narrower "has the card scrolled off the top", because
 * the card used to be reordered above the tab bar and a bar shown from first
 * paint would have put a second copy of the same two buttons on screen beside
 * the first. The card has since moved below the gallery, so the condition that
 * actually matters is the one that was always behind it: never show the bar
 * while the real buttons are already visible. Dropping the direction check is
 * what keeps that true in both layouts.
 *
 * The observer fires once on observe, so the answer is right on arrival —
 * including for a deep link that restores scroll position part-way down.
 */
export function useVendorDetailCtaBar(anchorId: string) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const anchor = document.getElementById(anchorId);
    if (!anchor) return;

    const compact = window.matchMedia(COMPACT);
    let offScreen = false;

    const sync = () => setOpen(compact.matches && offScreen);

    const observer = new IntersectionObserver(([entry]) => {
      offScreen = !entry.isIntersecting;
      sync();
    });
    observer.observe(anchor);
    compact.addEventListener('change', sync);

    return () => {
      observer.disconnect();
      compact.removeEventListener('change', sync);
    };
  }, [anchorId]);

  // Published to the WhatsApp FAB, which is mounted in the root layout and
  // would otherwise sit underneath the bar. See `@/lib/stickyCta`.
  useEffect(() => {
    if (!open) return;
    document.body.setAttribute(STICKY_CTA_ATTR, 'open');
    return () => document.body.removeAttribute(STICKY_CTA_ATTR);
  }, [open]);

  return open;
}
