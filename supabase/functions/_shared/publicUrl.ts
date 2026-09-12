// publicUrl — is this address one a payment provider can actually reach?
//
// WHY THIS EXISTS
// PayPal's Orders v2 API takes `application_context.return_url` and
// `cancel_url` and requires both to be publicly reachable HTTPS addresses:
// after the payer approves, PayPal itself sends the browser there. This
// project had them set to `http://localhost:3001/bookings`, which is neither.
//
// The cost of that was out of all proportion to the mistake. PayPal validates
// a create-order request field by field, so while the amount was still in UGX
// the call failed fast and loudly on CURRENCY_NOT_SUPPORTED. Fixing the
// currency let the request get PAST that check and reach the URLs — where it
// stopped answering at all. The Edge Function then sat on the outbound call
// until the runtime killed it at its wall-clock limit, and the payer got
// `upstream request timeout` roughly two and a half minutes later, with a
// `payments` row left pending and no order at PayPal to show for it.
//
// A deployment fault should be a sentence, not a stall. So the address is
// checked here — before a payment row exists, before a quote is consumed and
// before a single byte goes to the provider — and a bad one is refused by name.
//
// WHAT THIS IS NOT. It is not a security control: the URLs come from this
// project's own environment, not from a request body, so there is no attacker
// on this path. It is a configuration check, and every rejection is a
// misconfiguration to fix rather than an attempt to block.

/** Hosts that resolve to the machine asking, and so never to the provider. */
const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', '[::1]']);

export type UrlCheck = { ok: true; url: string } | { ok: false; reason: string };

/**
 * Accept an address a provider can redirect a real browser to.
 *
 * The reasons are deliberately specific. "Invalid URL" sends someone reading a
 * log to the wrong place; `not_https` and `not_publicly_reachable` each name
 * the single thing that has to change, and they are the two mistakes anyone
 * setting this up from a local dev environment actually makes.
 */
export function publicHttpsUrl(raw: string | null | undefined): UrlCheck {
  const value = (raw ?? '').trim();
  if (!value) return { ok: false, reason: 'missing' };

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  // PayPal will not redirect to plain HTTP, and a payment return arriving over
  // HTTP would put the payment id on the wire in clear either way.
  if (parsed.protocol !== 'https:') return { ok: false, reason: 'not_https' };

  const host = parsed.hostname.toLowerCase();

  if (LOOPBACK.has(host)) return { ok: false, reason: 'not_publicly_reachable' };
  // A single-label host — `myserver`, or a bare container name — resolves only
  // inside whatever network set it.
  if (!host.includes('.')) return { ok: false, reason: 'not_publicly_reachable' };
  // `.local` is mDNS, and the reserved TLDs are by definition not routable.
  if (/\.(local|internal|localhost|test|invalid|example)$/.test(host)) {
    return { ok: false, reason: 'not_publicly_reachable' };
  }
  if (isPrivateAddress(host)) return { ok: false, reason: 'not_publicly_reachable' };

  return { ok: true, url: parsed.toString() };
}

/** RFC 1918, carrier-grade NAT, link-local and loopback ranges. */
function isPrivateAddress(host: string): boolean {
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10 || a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true; // link-local
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  // IPv6 literals arrive bracketed from `URL.hostname` stripped of brackets.
  return host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80');
}

/**
 * Where a provider should send the browser back to, for one portal.
 *
 * Built from the portal's own origin rather than a separate PAYPAL_RETURN_URL,
 * because there are two portals with two origins and one env var cannot be
 * both: a vendor paying for a plan must land back in the vendor portal, and a
 * client funding escrow in the client portal. `create-payment` already makes
 * exactly this distinction for Pesapal's callback, and this is the same rule
 * applied to the rail that had been ignoring it.
 *
 * `override` exists for the case where the return has to go somewhere that is
 * not a portal route at all — kept because removing an escape hatch from a
 * payment integration is the sort of tidiness that costs someone a weekend.
 */
export function portalReturnUrl(
  portalOrigin: string | null | undefined,
  path = '/payments/return',
  override?: string | null,
): UrlCheck {
  if (override && override.trim()) return publicHttpsUrl(override);

  const root = (portalOrigin ?? '').trim().replace(/\/+$/, '');
  if (!root) return { ok: false, reason: 'missing' };
  return publicHttpsUrl(`${root}${path}`);
}

/**
 * Append a single query parameter to a validated URL string.
 *
 * Used after `publicHttpsUrl` / `portalReturnUrl` has already accepted the
 * address: those check scheme, host and reachability, and this adds a
 * parameter to the result without re-parsing or re-checking it.
 *
 * PayPal preserves the return URL's existing query string and appends its
 * own (`token`, `PayerID`), so embedding our payment id here means it
 * arrives back in the browser alongside PayPal's parameters.
 */
export function appendQueryParam(url: string, key: string, value: string): string {
  const u = new URL(url);
  u.searchParams.set(key, value);
  return u.toString();
}
