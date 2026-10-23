/**
 * The contract between a page's fixed mobile action bar and the global
 * WhatsApp FAB.
 *
 * The two are mounted in different trees — the FAB in the root layout, the bar
 * inside whichever container needs one — so neither can see the other's state
 * through React. The bar writes an attribute onto `<body>` while it is up and
 * the FAB reacts to it in CSS, which keeps the coupling to one documented
 * selector instead of a context provider threaded through the whole app for a
 * single translate.
 *
 * Both halves are below `md` only: above it the actions live in a sticky
 * sidebar and no bar is ever shown, so the FAB must not move.
 */
export const STICKY_CTA_ATTR = 'data-sticky-cta';

/**
 * The bar's height in pixels: 12px of padding, a 52–56px button and 12px more,
 * rounded up so the taller `sm` variant still clears it. Read by the FAB to
 * know how far to step up, and mirrored by the `padding-bottom` rule in
 * `globals.css` that keeps the footer scrollable clear of the bar — change
 * this and that rule changes with it.
 */
export const STICKY_CTA_HEIGHT = 84;

/**
 * Selector for "the bar is up", to nest inside the `sx` of anything that has
 * to get out of its way. Emotion resolves the trailing `&` to the element.
 */
export const STICKY_CTA_OPEN = `body[${STICKY_CTA_ATTR}='open'] &`;
