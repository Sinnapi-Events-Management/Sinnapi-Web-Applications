/**
 * Layout constants shared by the portals' profile pages, so the three cannot drift
 * on the one thing a user would notice immediately if they did.
 */

/** Clears the fixed app bar, with a little breathing room above the card. */
const STICKY_TOP = 88;

/**
 * The side column that holds the photo and the read-only facts.
 *
 * Sticky from `md` up, so the picture someone has just changed stays in view while
 * they work down the form beside it instead of sliding off the top.
 *
 * The `maxHeight`/`overflowY` pair is not decoration — it is what makes sticky safe
 * here. A sticky column taller than the viewport has its bottom pinned off-screen
 * and unreachable, because the page scroll no longer moves it; the Business tab's
 * column (logo plus five listing facts) is exactly tall enough for that to bite on
 * a laptop. Capping the height and letting the column scroll itself keeps every
 * card reachable at any window size, and on shorter columns — the common case — the
 * cap never engages and no scrollbar appears.
 */
export const profileSideColumnSx = {
  position: { md: 'sticky' },
  top: { md: STICKY_TOP },
  maxHeight: { md: `calc(100vh - ${STICKY_TOP + 16}px)` },
  overflowY: { md: 'auto' },
  // The focus ring on the picker sits outside the card's box; without this the
  // scroll container would clip it.
  px: { md: 0.5 },
  mx: { md: -0.5 },
} as const;
