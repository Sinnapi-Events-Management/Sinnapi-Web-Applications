/**
 * Re-export only. The parser moved to `@sinnapi/utils/userAgent` when sign-out
 * logging gave the client and vendor portals the same need — three copies of a
 * table of browser quirks is three places to update when a browser ships a new
 * token. This file stays so the existing `@/lib/userAgent` imports keep working
 * and there is one obvious place to look for it in this app.
 */
export { parseUserAgent } from '@sinnapi/utils/userAgent';
export type { ParsedUserAgent } from '@sinnapi/utils/userAgent';
