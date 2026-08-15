import { useCallback, useMemo, useState } from 'react';
import { useNewsletterAudience, useNewsletterAudienceCounts } from '@/hooks/queries';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { NewsletterAudience } from '@/lib/types';

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
 */
export function useCampaignAudience(audience: NewsletterAudience) {
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput, 300).trim() || undefined;
  const [page, setPage] = useState(0);

  const [selectAll, setSelectAll] = useState(true);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [manualEmails, setManualEmails] = useState<string[]>([]);
  const [importedEmails, setImportedEmails] = useState<string[]>([]);
  const [attested, setAttested] = useState(false);

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

  /**
   * Manual + imported addresses, merged and de-duplicated.
   *
   * Overlap between the two is expected — somebody types an address, then
   * uploads the spreadsheet it came from — and the server de-duplicates against
   * the audience too, but showing one honest number here is what stops the
   * confirmation dialog from over-promising.
   */
  const extraEmails = useMemo(
    () => Array.from(new Set([...manualEmails, ...importedEmails])),
    [manualEmails, importedEmails],
  );

  const totalSelected = audienceSelectedCount + extraEmails.length;

  /** Ad-hoc addresses carry no consent record, so the attestation is required. */
  const needsAttestation = extraEmails.length > 0;
  const canQueue = totalSelected > 0 && (!needsAttestation || attested);

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

    manualEmails,
    setManualEmails,
    importedEmails,
    setImportedEmails,
    extraEmails,

    attested,
    setAttested,
    needsAttestation,

    totalSelected,
    canQueue,

    /** Exactly the arguments `admin_newsletter_queue` expects. */
    queueArgs: {
      p_select_all: selectAll,
      p_search: search ?? null,
      p_profile_ids: selectAll ? null : Array.from(selected),
      p_excluded_ids: selectAll ? Array.from(excluded) : null,
      p_extra_emails: extraEmails,
      p_attested: attested,
    },
  };
}
