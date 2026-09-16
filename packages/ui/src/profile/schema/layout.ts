/**
 * Layout constants shared by the portals' profile pages, so the three cannot drift
 * on the one thing a user would notice immediately if they did.
 */

/** Clears the fixed app bar, with a little breathing room above the card. */
export const PROFILE_STICKY_TOP = 88;

/**
 * The fixed app bar's height below `md` — MUI's default toolbar. The section nav
 * pins directly under it on phones and tablets.
 */
export const PROFILE_MOBILE_STICKY_TOP = { xs: 56, sm: 64 } as const;

/**
 * The side column that holds the photo and the read-only facts.
 *
 * Sticky on wide *and* tall viewports only, so the picture someone has just
 * changed stays in view while they work down the form beside it.
 *
 * The height condition replaces an earlier `maxHeight` + `overflowY: auto` cap.
 * That kept a tall column reachable, but at the price of a second scrollbar inside
 * the page — cards appeared cut off mid-row and the user had two scroll areas to
 * manage. A sticky column taller than the viewport is unreachable, so on a short
 * window the column now simply scrolls with the page instead.
 */
export const profileSideColumnSx = {
  '@media (min-width: 900px) and (min-height: 820px)': {
    position: 'sticky',
    top: PROFILE_STICKY_TOP,
  },
} as const;
