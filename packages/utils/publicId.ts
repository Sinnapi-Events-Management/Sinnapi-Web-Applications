/**
 * Public identifiers — the platform's user-facing record ids.
 *
 * Every entity a person may quote carries one: `SV285K7BV9` is a vendor,
 * `SQ7657H8YH` a quotation, `SC48213MQH` a client account. They are minted in
 * Postgres and only in Postgres (`mint_public_id`, migration 20260829000001), so
 * nothing in this module generates one — a client that could mint an identifier
 * could squat one, and the registry that guarantees global uniqueness is not
 * reachable from the browser by design.
 *
 * What lives here is everything the four portals need to *read* one: the
 * category map, a strict validator, an input normaliser, and a parser. It is in
 * `@sinnapi/utils` rather than `@sinnapi/ui` because none of it renders anything
 * — the admin lookup, a route guard and a form validator all want these without
 * pulling in MUI.
 *
 * THE SHAPE
 *
 *     SV285K7BV9
 *     ├┘└──────┘
 *     │        └─ 8 characters: exactly 5 digits and 3 letters, shuffled
 *     └────────── 2 uppercase letters: S for Sinnapi, then the category
 *
 * The letters are drawn from `A-Z` less `I`, `L`, `O` and `U` — the first three
 * because they are unreadable against `1` and `0` on a printed quotation, and
 * `U` so the generator can never spell an obscenity. That exclusion is what
 * makes `normalizePublicId` below safe as well as convenient.
 */

/**
 * Prefix → the word a person would use for that kind of record.
 *
 * Kept in step with the trigger definitions in migrations 20260829000002 through
 * 20260829000004; those are the source of truth and this is the display side of
 * the same map. Four prefixes are not the obvious initial and the reason is
 * recorded beside each, because "why is a payment ST?" is otherwise a question
 * with no answer anywhere in the frontend.
 */
export const PUBLIC_ID_CATEGORIES = {
  // Identity
  SA: 'Admin',
  SC: 'Client',
  SP: 'Planner',
  SV: 'Vendor',
  SL: 'Vendor application',
  // Transactional
  SE: 'Event',
  SQ: 'Quotation',
  SB: 'Booking',
  ST: 'Payment', // T for transaction: SP is the event planner's
  SO: 'Payout',
  SX: 'Escrow', // X for funds held rather than moved: SE is an event's
  SR: 'Refund',
  SD: 'Dispute',
  SG: 'Settlement', // G for the grant of held funds: SS is a subscription's
  // Admin-managed
  SS: 'Subscription',
  SM: 'Promotion', // M for marketing: SP is taken
  SN: 'Newsletter',
} as const;

export type PublicIdPrefix = keyof typeof PUBLIC_ID_CATEGORIES;

/** The 22 letters a token may contain: `A-Z` less `I`, `L`, `O`, `U`. */
export const PUBLIC_ID_LETTERS = 'ABCDEFGHJKMNPQRSTVWXYZ';

/** Characters an identifier is made of, for an `inputMode`/`pattern` attribute. */
export const PUBLIC_ID_LENGTH = 10;

/**
 * Loose shape only — two uppercase letters and eight alphanumerics.
 *
 * Deliberately weaker than {@link isPublicId}: this is what a text input should
 * accept while the user is still typing and what a route param should be matched
 * against, where rejecting a well-formed-but-unissued id is the server's job
 * rather than the regex's.
 */
export const PUBLIC_ID_PATTERN = /^[A-Z]{2}[0-9A-Z]{8}$/;

/**
 * Confusable characters, and what the sender can only have meant.
 *
 * Because `I`, `L` and `O` are excluded from the token alphabet, an identifier
 * containing one is not merely unusual — it is impossible. So a caller who reads
 * "ess-vee-two-eight-five-kay-seven-bee-vee-oh" to a support agent, or a client
 * who retypes a reference off a PDF, can be corrected without ambiguity. `U` is
 * excluded too but has no digit it could have been, so it is left alone to fail
 * validation rather than be silently rewritten into something wrong.
 */
const CONFUSABLES: Record<string, string> = { I: '1', L: '1', O: '0' };

/**
 * Clean up something a human typed or pasted into an identifier field.
 *
 * Uppercases, drops whitespace, and resolves the confusable letters above. It
 * does not strip hyphens: a legacy quotation reference is `Q-7657H8YH` and the
 * hyphen is what distinguishes it from the current `SQ7657H8YH`, so removing it
 * would turn one valid lookup into a different one.
 */
export function normalizePublicId(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[ILO]/g, (c) => CONFUSABLES[c] ?? c);
}

/**
 * Strict validation: the shape *and* the composition the generator guarantees —
 * exactly five digits, exactly three letters, none of them `I`/`L`/`O`/`U`.
 *
 * Strictness is worth having on the way in. A support agent pasting a mistyped
 * id gets told so immediately instead of waiting on a round trip that can only
 * answer "not found", which is the same message for a typo and for a record that
 * was never issued — two problems with very different next steps.
 *
 * Note this says nothing about whether the id *exists*. Only the registry knows
 * that, and only the server can ask it.
 */
export function isPublicId(value: string): boolean {
  if (!PUBLIC_ID_PATTERN.test(value)) return false;

  const token = value.slice(2);
  const digits = token.replace(/[^0-9]/g, '').length;
  const letters = token.replace(/[^A-Z]/g, '');

  return (
    digits === 5 && letters.length === 3 && [...letters].every((c) => PUBLIC_ID_LETTERS.includes(c))
  );
}

/** Is this a reference issued before migration 20260829000004? e.g. `Q-7657H8YH`. */
export function isLegacyReference(value: string): boolean {
  return /^[A-Z]{1,2}-[0-9A-Z-]{6,}$/.test(value.trim().toUpperCase());
}

/**
 * Split an identifier into its parts, or `null` if it is not one.
 *
 * `category` is `undefined` for a well-formed id whose prefix this build does
 * not know — a portal deployed a version behind one that added a category should
 * show the id plainly rather than refuse to render it.
 */
export function parsePublicId(
  value: string,
): { prefix: string; category?: string; token: string } | null {
  const normalized = normalizePublicId(value);
  if (!isPublicId(normalized)) return null;

  const prefix = normalized.slice(0, 2);
  return {
    prefix,
    category: PUBLIC_ID_CATEGORIES[prefix as PublicIdPrefix],
    token: normalized.slice(2),
  };
}

/**
 * The word for what an identifier names, for a chip or a result row.
 *
 * Falls back to `'Record'` rather than to the raw prefix: an unrecognised
 * two-letter code shown as a label reads like a bug, whereas "Record" is merely
 * unspecific and still true.
 */
export function publicIdCategory(value: string): string {
  return parsePublicId(value)?.category ?? 'Record';
}
