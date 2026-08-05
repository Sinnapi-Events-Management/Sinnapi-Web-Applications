/**
 * Minimal user-agent parsing for the security views.
 *
 * Shared by all three portals: the Blocked Accounts page renders it, and each
 * portal's `logSignOut` sends it to the audit trail, because a sign-out is the
 * one auth event with no Edge Function in the path to parse the header for us.
 *
 * `supabase/functions/_shared/userAgent.ts` is the same logic for the Deno
 * runtime. The duplication is a runtime boundary, not an oversight — Edge
 * Functions are bundled from `supabase/functions/` alone and cannot import from
 * this workspace. A change here is a change there.
 *
 * Hand-rolled rather than pulling in `ua-parser-js`, and worth saying why: this
 * needs to answer one question — "is this the device the account normally signs
 * in from?" — for which "Chrome on Windows" is as useful as an exhaustively
 * versioned parse. A parser library is ~20 KB of admin-bundle weight plus a
 * dependency that needs updating to keep recognising new browsers, for accuracy
 * nobody here consumes.
 *
 * Order matters throughout: user-agent strings are a museum of compatibility
 * lies. Every Chromium browser claims to be Safari, Edge claims to be Chrome,
 * and iPadOS claims to be a Mac. So the most specific token is always tested
 * first and the generic ones act as fallbacks.
 *
 * Unknown input degrades to `null`, never to a guess — in a security view, a
 * confidently wrong device is worse than an honest blank.
 */

export type ParsedUserAgent = {
  /** e.g. "Chrome 141" */
  browser: string | null;
  /** e.g. "Windows", "iOS 17" */
  os: string | null;
  /** Rough form factor, for the icon. */
  device: 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown';
};

const EMPTY: ParsedUserAgent = { browser: null, os: null, device: 'unknown' };

/** Most specific first — Edge and Opera both carry "Chrome" in their UA. */
const BROWSERS: Array<[label: string, re: RegExp]> = [
  ['Edge', /\bEdg(?:e|A|iOS)?\/([\d.]+)/],
  ['Opera', /\bOPR\/([\d.]+)/],
  ['Samsung Internet', /\bSamsungBrowser\/([\d.]+)/],
  ['Firefox', /\b(?:Firefox|FxiOS)\/([\d.]+)/],
  ['Chrome', /\b(?:Chrome|CriOS)\/([\d.]+)/],
  // Safari's own version lives in `Version/`, not in the `Safari/` build number.
  ['Safari', /\bVersion\/([\d.]+).*\bSafari\//],
];

/** Windows NT build numbers → the marketing name people recognise. */
const WINDOWS_NT: Record<string, string> = {
  '10.0': '10/11',
  '6.3': '8.1',
  '6.2': '8',
  '6.1': '7',
};

function majorVersion(raw: string | undefined): string | null {
  const major = raw?.split('.')[0];
  return major && /^\d+$/.test(major) ? major : null;
}

function parseBrowser(ua: string): string | null {
  for (const [label, re] of BROWSERS) {
    const match = re.exec(ua);
    if (!match) continue;
    const version = majorVersion(match[1]);
    return version ? `${label} ${version}` : label;
  }
  return null;
}

function parseOs(ua: string): string | null {
  // iOS/iPadOS before macOS: an iPad reports "Macintosh" in desktop mode, and
  // "CPU OS" only ever appears on an Apple mobile device.
  const ios = /\b(?:iPhone|iPad|iPod).*?\bOS (\d+)[_\d]*/.exec(ua);
  if (ios) return `iOS ${ios[1]}`;

  const android = /\bAndroid (\d+)/.exec(ua);
  if (android) return `Android ${android[1]}`;

  const windows = /\bWindows NT ([\d.]+)/.exec(ua);
  if (windows) return `Windows ${WINDOWS_NT[windows[1]] ?? windows[1]}`;

  const mac = /\bMac OS X (\d+)[_.](\d+)/.exec(ua);
  // Apple froze the reported version at 10.15.7 years ago, so anything from
  // that point on is only honestly describable as "macOS".
  if (mac) return mac[1] === '10' && Number(mac[2]) >= 15 ? 'macOS' : `macOS ${mac[1]}.${mac[2]}`;

  if (/\bCrOS\b/.test(ua)) return 'ChromeOS';
  if (/\bLinux\b/.test(ua)) return 'Linux';
  return null;
}

function parseDevice(ua: string): ParsedUserAgent['device'] {
  if (/\b(?:bot|crawler|spider|curl|wget|python-requests|httpclient)\b/i.test(ua)) return 'bot';
  if (/\biPad\b/.test(ua) || (/\bAndroid\b/.test(ua) && !/\bMobile\b/.test(ua))) return 'tablet';
  if (/\b(?:Mobi|iPhone|iPod|Android)\b/.test(ua)) return 'mobile';
  if (/\b(?:Windows|Macintosh|CrOS|X11|Linux)\b/.test(ua)) return 'desktop';
  return 'unknown';
}

export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  const raw = (ua ?? '').trim();
  if (!raw) return EMPTY;
  return { browser: parseBrowser(raw), os: parseOs(raw), device: parseDevice(raw) };
}
