/**
 * The public site's Turnstile site key.
 *
 * Public by design — the site key identifies the widget to Cloudflare and is
 * visible in the page source of every site using Turnstile. The value that must
 * stay private is the SECRET, which lives only in the Edge Functions'
 * environment as `TURNSTILE_SECRET` and never reaches this bundle.
 *
 * Written as a full literal `process.env.NEXT_PUBLIC_*` member access because
 * that is the only form Next inlines at build time; destructuring `process.env`
 * or building the key name dynamically yields `undefined` in the browser.
 *
 * Defaults to an empty string rather than throwing: `CaptchaField` renders an
 * explicit "verification unavailable" state and keeps submit disabled, which is
 * a better failure than a page that white-screens on a missing env var.
 */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
