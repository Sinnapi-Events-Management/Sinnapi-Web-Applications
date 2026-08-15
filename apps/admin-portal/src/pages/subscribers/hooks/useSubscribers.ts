import { useCallback, useMemo, useState } from 'react';
import { useTableState, type PageFilters } from '@sinnapi/ui';
import {
  useMarketingSubscriptions,
  useMarketingSubscriptionCounts,
  useEmailSuppressions,
} from '@/hooks/queries';
import { useSearchTerm } from '@/hooks/useSearchTerm';
import { useStatusFilter, ALL_STATUSES } from '@/hooks/useStatusFilter';
import { CONSENT_STATUSES, buildSubscriberTabs, type SubscriberTab } from '../schema';

/**
 * The consent register: who agreed to what, when, and who can no longer be
 * mailed at all.
 *
 * ── Why this page is read-only ────────────────────────────────────────────
 * There is no "subscribe this person" button and no bulk import here, and that
 * is the whole design. A consent record an operator can create is not evidence
 * of consent, it is evidence of an operator — and the only reason to keep this
 * data for years is so it can answer a regulator or a complaint. The only ways
 * in are the ones where a person acted: a sign-up checkbox, a confirmation
 * link, the preference centre, or an attested import that is recorded as such.
 *
 * Two datasets share the page because they answer one question between them:
 * `marketing_subscriptions` says who opted in to what, `email_suppressions`
 * says which addresses are unusable regardless. An address can be subscribed
 * and suppressed at once (it bounced), and seeing only the first would be
 * actively misleading.
 */
export function useSubscribers() {
  const [tab, setTab] = useState<SubscriberTab>('subscriptions');

  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { onPageChange } = table.controls;
  const resetPage = useCallback(() => onPageChange(0), [onPageChange]);

  const status = useStatusFilter({ valid: CONSENT_STATUSES, onChange: resetPage });
  const search = useSearchTerm({ onChange: resetPage });

  const subscriptionParams = useMemo(() => {
    const filters: PageFilters = {};
    if (status.value !== ALL_STATUSES) filters.status = status.value;
    if (search.query) filters.search = search.query;
    return { ...table.params, filters: Object.keys(filters).length ? filters : undefined };
  }, [table.params, status.value, search.query]);

  const suppressionParams = useMemo(() => {
    const filters: PageFilters = {};
    if (search.query) filters.search = search.query;
    return { ...table.params, filters: Object.keys(filters).length ? filters : undefined };
  }, [table.params, search.query]);

  const subscriptions = useMarketingSubscriptions(subscriptionParams);
  const suppressions = useEmailSuppressions(suppressionParams);
  const { data: counts, isLoading: countsLoading } = useMarketingSubscriptionCounts(search.query);

  const active = tab === 'subscriptions' ? subscriptions : suppressions;
  const filtered = Boolean(search.query) || status.value !== ALL_STATUSES;

  const changeTab = useCallback(
    (next: SubscriberTab) => {
      setTab(next);
      resetPage();
    },
    [resetPage],
  );

  return {
    tab,
    changeTab,
    tabs: buildSubscriberTabs(counts),

    subscriptionRows: subscriptions.data?.rows ?? [],
    suppressionRows: suppressions.data?.rows ?? [],
    total: active.data?.total ?? 0,
    isLoading: active.isLoading || active.isFetching,
    pageError: active.error
      ? active.error instanceof Error
        ? active.error.message
        : 'Failed to load.'
      : null,
    emptyMessage: filtered
      ? 'Nothing matches these filters.'
      : tab === 'subscriptions'
        ? 'No newsletter subscriptions yet.'
        : 'No suppressed addresses — nothing has bounced or been reported.',

    counts,
    countsLoading,
    statusValue: status.value as string,
    // See the note in `useNewsletters` — widened for the segmented control,
    // re-narrowed by `useStatusFilter` before it reaches a query.
    onStatusChange: status.setValue as (next: string) => void,
    search,
    table,
  };
}
