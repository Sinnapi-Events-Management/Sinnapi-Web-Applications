/**
 * The four places a recipient can come from.
 *
 * ── Why these are a switcher and not four stacked cards ───────────────────
 * The audience step used to render every source at once: the account table, the
 * by-hand form, the importer and the address-book picker, one under the other.
 * That is roughly two thousand pixels of page, and the three sources below the
 * table were only ever found by an operator who already knew they existed —
 * which is precisely the operator who does not need them. The common case, an
 * audience with nobody opted in yet, showed an empty table and no visible way
 * forward.
 *
 * Presented as a switcher, all four are on screen before anything is scrolled,
 * each carrying its own count, and only the chosen one costs any height.
 *
 * ── The order is the order they are reached for ───────────────────────────
 * Accounts first because it is the only source that needs no preparation.
 * Then by hand (a few people), then a spreadsheet (many people, prepared
 * elsewhere), then a saved book (many people, prepared here, earlier).
 */
export const RECIPIENT_SOURCES = [
  {
    key: 'accounts',
    label: 'Sinnapi accounts',
    hint: 'Account holders who opted in to this topic.',
  },
  {
    key: 'manual',
    label: 'Added by hand',
    hint: 'Typed in one at a time, a name and an address.',
  },
  {
    key: 'import',
    label: 'Spreadsheet',
    hint: 'A .xlsx or .csv uploaded for this send.',
  },
  {
    key: 'saved',
    label: 'Address book',
    hint: 'A list you saved from an earlier send.',
  },
] as const;

export type RecipientSource = (typeof RECIPIENT_SOURCES)[number]['key'];

/** Everything except the account audience — the three `useExtraRecipients` owns. */
export type ExtraRecipientSource = Exclude<RecipientSource, 'accounts'>;

export const DEFAULT_RECIPIENT_SOURCE: RecipientSource = 'accounts';

export function isRecipientSource(value: string | null): value is RecipientSource {
  return RECIPIENT_SOURCES.some((s) => s.key === value);
}
