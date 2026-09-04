// Shared CORS headers. `Access-Control-Allow-Origin` is granted only to the
// Sinnapi app origins listed in the ALLOWED_ORIGINS env (comma-separated).
//
// Fails closed. An unset env used to fall back to "*", which meant a project
// where the variable was forgotten silently let any site on the web call the
// functions with a signed-in user's credentials. Now an unset env, or an
// origin not on the list, gets no allow-origin header at all and the browser
// refuses the response. Non-browser callers (cron, the PSPs) send no Origin
// and are unaffected: CORS only ever constrained browsers.
const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, idempotency-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}
