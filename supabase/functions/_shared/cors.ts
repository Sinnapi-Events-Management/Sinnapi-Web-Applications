// Shared CORS headers. Lock `Access-Control-Allow-Origin` down to the Sinnapi
// app origins in production via the ALLOWED_ORIGINS env (comma-separated).
const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = origin && (allowed.length === 0 || allowed.includes(origin)) ? origin : (allowed[0] ?? "*");
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
