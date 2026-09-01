/**
 * The plan-limit refusals `tg_enforce_media_limit` raises, as sentences.
 *
 * The trigger raises with an interpolated cap — `plan_limit: portfolio image cap
 * (10) reached` — so these are matched as substrings by `rpcErrorMessage`, which
 * tests `haystack.includes(token)` for exactly this case. Without them the vendor
 * is shown raw Postgres text naming an internal feature key; with them they are
 * told what to do about it, which is always "upgrade" and is therefore worth
 * saying rather than making them guess.
 */
export const MEDIA_ERRORS: Record<string, string> = {
  'plan_limit: video not included':
    'Video is available on the Professional and Elite plans. Upgrade to add clips to your portfolio.',
  'plan_limit: portfolio image cap':
    'You have reached your plan’s image limit. Remove an image, or upgrade for unlimited uploads.',
};
