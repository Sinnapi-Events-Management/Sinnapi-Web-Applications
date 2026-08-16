import { useCallback, useMemo, useState } from 'react';
import { useNewsletterAudience, useNewsletterAudienceCounts } from '@/hooks/queries';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { NewsletterAudience } from '@/lib/types';
import { useExtraRecipients } from './useExtraRecipients';

export type AudienceApi = ReturnType<typeof useCampaignAudience>;

const PAGE_SIZE = 25;

/**
 * Audience selection for one campaign.
 *
 * ── The selection model, and why it is not a Set of ids ────────────────────
 * The default is "everyone", and the audience can be tens of thousands of
 * people across hundreds of pages. Modelling that as a set of selected ids
 * means either loading every id into the browser to tick them, or — far worse,
 * and the bug this shape exists to prevent — sending only the ids that happened
 * to be loaded, so "select all" quietly mails the 25 rows on screen.
 *
 * So selection is a MODE plus a delta:
 *
 *   selectAll = true    everyone eligible in (audience + search), minus
 *                       `excluded`. Unticking a row adds to `excluded`.
 *   selectAll = false   exactly `selected`. Entered by unticking the header
 *                       box, which is the gesture for "actually, let me pick".
 *
 * Both are sent to `admin_newsletter_queue`, which resolves them server-side
 * against the same join the send uses — so what the operator was shown and what
 * is mailed cannot diverge.
 *
 * ── Search interacts with select-all deliberately ──────────────────────────
 * With a search term active, "all" means all MATCHING, not all in the audience.
 * That is what makes search usable as a coarse segment ("everyone in Kampala"),
 * and it is why the search term is passed to the queue RPC alongside the mode.
 *
 * ── What this hook deliberately does NOT own ───────────────────────────────
 * Everyone who is not an account holder — typed-in contacts, spreadsheet
 * imports, saved address books — belongs to `useExtraRecipients`. They share
 * nothing with the audience but the total at the bottom of the screen: no
 * pagination, no consent join, no profile ids, and a whole attestation flow of
 * their own. Folding them back in here is what made the old version of this
 * hook hard to read, and it is why the two are composed rather than merged.
 */
export function useCampaignAudience(audience: NewsletterAudience) {
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput, 300).trim() || undefined;
  const [page, setPage] = useState(0);

  const [selectAll, setSelectAll] = useState(true);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const extras = useExtraRecipients();

  const { data, isLoading, isFetching, error } = useNewsletterAudience({
    audience,
    search,
    page,
    pageSize: PAGE_SIZE,
  });
  const { data: counts, isLoading: countsLoading } = useNewsletterAudienceCounts({
    audience,
    search,
  });

  const onSearchChange = useCallback((next: string) => {
    setSearchInput(next);
    setPage(0);
  }, []);

  const isRowSelected = useCallback(
    (profileId: string, eligible: boolean) => {
      if (!eligible) return false;
      return selectAll ? !excluded.has(profileId) : selected.has(profileId);
    },
    [selectAll, excluded, selected],
  );

  const toggleRow = useCallback(
    (profileId: string) => {
      if (selectAll) {
        setExcluded((prev) => {
          const next = new Set(prev);
          if (next.has(profileId)) next.delete(profileId);
          else next.add(profileId);
          return next;
        });
      } else {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(profileId)) next.delete(profileId);
          else next.add(profileId);
          return next;
        });
      }
    },
    [selectAll],
  );

  /** The header checkbox: on → everyone matching, off → nobody, pick manually. */
  const toggleAll = useCallback((next: boolean) => {
    setSelectAll(next);
    setExcluded(new Set());
    setSelected(new Set());
  }, []);

  const audienceSelectedCount = useMemo(() => {
    if (!selectAll) return selected.size;
    return Math.max((counts?.eligible ?? 0) - excluded.size, 0);
  }, [selectAll, selected.size, counts?.eligible, excluded.size]);

  const totalSelected = audienceSelectedCount + extras.extraCount;

  /** Ad-hoc addresses carry no consent record, so the attestation is required. */
  const canQueue = totalSelected > 0 && (!extras.needsAttestation || extras.attested);

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    counts,
    countsLoading,
    isLoading,
    isFetching,
    error: error instanceof Error ? error.message : null,

    searchInput,
    onSearchChange,
    page,
    pageSize: PAGE_SIZE,
    setPage,

    selectAll,
    toggleAll,
    isRowSelected,
    toggleRow,
    audienceSelectedCount,

    /** Typed, imported and saved-list recipients — see `useExtraRecipients`. */
    extras,
    // Re-exported because the review step asks about the send as a whole, and
    // should not have to know which of the two hooks holds the attestation.
    attested: extras.attested,
    needsAttestation: extras.needsAttestation,

    totalSelected,
    canQueue,

    /** Exactly the arguments `admin_newsletter_queue` expects. */
    queueArgs: {
      p_select_all: selectAll,
      p_search: search ?? null,
      p_profile_ids: selectAll ? null : Array.from(selected),
      p_excluded_ids: selectAll ? Array.from(excluded) : null,
      ...extras.queueArgs,
    },
  };
}
