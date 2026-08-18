import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DEFAULT_RECIPIENT_SOURCE,
  RECIPIENT_SOURCES,
  isRecipientSource,
  type RecipientSource,
} from '../schema';
import type { AudienceApi } from './useCampaignAudience';

export type RecipientSourceTab = (typeof RECIPIENT_SOURCES)[number] & {
  /** How many recipients this source is currently contributing. */
  count: number;
};

export type RecipientSourcesApi = ReturnType<typeof useRecipientSources>;

/**
 * Which source of recipients the operator is looking at.
 *
 * ── Why the count travels with the tab ────────────────────────────────────
 * Showing one source at a time only works if the other three can still be
 * accounted for without opening them. The number on each tab is that account:
 * an operator who uploaded a spreadsheet, moved to the address book and came
 * back to the review step can see all four contributions at once, and the sum
 * is the same `totalSelected` the send is built from — not a second tally that
 * could drift from it.
 *
 * ── Why the choice lives in the URL ───────────────────────────────────────
 * Same reason the composer step does: a reload, a bookmark or a link shared
 * with a colleague lands on the source that was being talked about, rather than
 * silently back on the account table. It is a view preference, so it `replace`s
 * rather than pushing — the back button belongs to the composer's steps, not to
 * every tab click inside one.
 */
export function useRecipientSources(api: AudienceApi) {
  const [params, setParams] = useSearchParams();

  const raw = params.get('from');
  const source: RecipientSource = isRecipientSource(raw) ? raw : DEFAULT_RECIPIENT_SOURCE;

  const setSource = useCallback(
    (next: RecipientSource) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set('from', next);
          return p;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const { audienceSelectedCount, extras, totalSelected } = api;
  const typedCount = extras.typedContacts.length;
  const importedCount = extras.importedContacts.length;
  const { listSelectedCount } = extras;

  const counts = useMemo<Record<RecipientSource, number>>(
    () => ({
      accounts: audienceSelectedCount,
      manual: typedCount,
      import: importedCount,
      saved: listSelectedCount,
    }),
    [audienceSelectedCount, typedCount, importedCount, listSelectedCount],
  );

  const tabs = useMemo<RecipientSourceTab[]>(
    () => RECIPIENT_SOURCES.map((entry) => ({ ...entry, count: counts[entry.key] })),
    [counts],
  );

  const active = useMemo(
    () => RECIPIENT_SOURCES.find((entry) => entry.key === source) ?? RECIPIENT_SOURCES[0],
    [source],
  );

  return {
    source,
    setSource,
    /** The four tabs, each with the number it is contributing right now. */
    tabs,
    counts,
    /** The chosen tab's copy, for the panel heading. */
    active,
    /**
     * The headline: audience plus extras, the same number the review step
     * confirms and the send is built from.
     */
    total: totalSelected,
  };
}
