/**
 * Narrow a `?returnTo=` value down to something safe to navigate to.
 *
 * `ProtectedRoute` puts the route you were refused onto the sign-in URL so you
 * land back there afterwards, which means the destination is attacker-supplied:
 * anyone can hand out a link to our own sign-in page carrying whatever
 * `returnTo` they like. Passed to `navigate()` unchecked, a value like
 * `//evil.example` or `https://evil.example` resolves against the origin and
 * walks the user straight off the portal — with the credibility of having just
 * signed in on a real Sinnapi domain.
 *
 * So: same-origin absolute paths only. Anything else falls back to `fallback`.
 */
export function safeReturnTo(raw: string | null, fallback: string): string {
  if (!raw) return fallback;

  let value: string;
  try {
    value = decodeURIComponent(raw);
  } catch {
    // Malformed percent-encoding — not something we should try to salvage.
    return fallback;
  }

  // Must be rooted, and must not be protocol-relative ("//host" is a URL, not a
  // path). Backslashes are rejected because browsers normalise "\\" to "//".
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (value.includes('\\')) return fallback;

  // A scheme anywhere in a value that already passed the checks above means
  // something is being smuggled ("/\/evil", "/javascript:...").
  if (/^\/+[a-z][a-z0-9+.-]*:/i.test(value)) return fallback;

  return value;
}
