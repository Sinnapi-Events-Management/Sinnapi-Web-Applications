/**
 * Presentation helpers for network identifiers in the security views.
 *
 * IP addresses are personal data. Sinnapi processes them under legitimate
 * interest (detecting unauthorised access), which needs no consent but does
 * require minimisation — so the default rendering is masked, and the full value
 * is a deliberate, logged act rather than something an admin reads by accident
 * while scanning a table.
 */

/**
 * Mask an address down to its network portion.
 *
 * IPv4 keeps the first two octets: enough to tell two sign-ins apart by rough
 * network, not enough to identify a subscriber line. IPv6 keeps the first three
 * groups, which is the routing prefix — the interface identifier at the end is
 * the part that can be device-specific, so it is exactly the part dropped.
 */
export function maskIp(ip: string | null | undefined): string | null {
  const value = (ip ?? '').trim();
  if (!value) return null;

  if (value.includes(':')) {
    const groups = value.split(':').filter(Boolean);
    return groups.length <= 3 ? value : `${groups.slice(0, 3).join(':')}:···`;
  }

  const octets = value.split('.');
  if (octets.length !== 4) return value;
  return `${octets[0]}.${octets[1]}.···.···`;
}

/**
 * Regional-indicator flag for an ISO-3166 alpha-2 code.
 *
 * Built from the code itself rather than a lookup table of 250 entries, and it
 * degrades safely: anything that is not two ASCII letters returns null instead
 * of rendering a pair of stray symbols.
 */
export function countryFlag(code: string | null | undefined): string | null {
  const cc = (code ?? '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return null;
  const REGIONAL_INDICATOR_A = 0x1f1e6;
  return String.fromCodePoint(
    ...[...cc].map((c) => REGIONAL_INDICATOR_A + (c.charCodeAt(0) - 'A'.charCodeAt(0))),
  );
}
