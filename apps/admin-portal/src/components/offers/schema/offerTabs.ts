import type { OfferStatusFilter } from '@/hooks/queries';

export type OfferTab = { value: OfferStatusFilter; label: string; count?: number };

/**
 * The console's filter tabs, in the order an operator works them.
 *
 * `live` leads because it is the only tab where a decision is still worth
 * making — everything on it is being shown to clients right now. `suspended`
 * comes second rather than last: it is the record of what this console has
 * already done, and an operator reversing a take-down should not have to hunt
 * for it behind four states they were not looking for.
 *
 * `exhausted` is here even though it is not a moderation state, because it is
 * the one that most often explains a support ticket — "my code stopped working"
 * is nearly always a campaign that sold out, and being able to see that in one
 * click is the difference between an answer and an investigation.
 */
export function offerTabs(counts: Record<string, number> | undefined): OfferTab[] {
  const at = (key: string) => counts?.[key];

  return [
    { value: 'live', label: 'Live', count: at('live') },
    { value: 'suspended', label: 'Withdrawn', count: at('suspended') },
    { value: 'scheduled', label: 'Scheduled', count: at('scheduled') },
    { value: 'paused', label: 'Paused', count: at('paused') },
    { value: 'exhausted', label: 'Fully claimed', count: at('exhausted') },
    { value: 'ended', label: 'Ended', count: at('ended') },
    { value: 'all', label: 'All' },
  ];
}

/**
 * Which set of offers is being listed, which is what an empty one means.
 *
 * The same tab over the whole platform and over one vendor are different
 * statements — "no offers are running right now" is a fact about Sinnapi, and
 * on a vendor page it is a fact about that business — and an operator reading
 * the platform sentence on a vendor page would conclude the console was broken.
 */
export type OfferScopeSubject = 'platform' | 'vendor';

/** What an empty list means, which depends on the tab AND on whose it is. */
export function offerEmptyMessage(
  tab: OfferStatusFilter,
  isSearching: boolean,
  subject: OfferScopeSubject = 'platform',
): string {
  if (isSearching) return 'No offers match that search.';

  if (subject === 'vendor') {
    switch (tab) {
      case 'live':
        return 'This vendor has nothing running. Clients see their list prices.';
      case 'suspended':
        return 'Nothing of theirs has been withdrawn.';
      case 'scheduled':
        return 'They have nothing queued to start.';
      case 'paused':
        return 'They have not paused anything.';
      case 'exhausted':
        return 'None of their offers has hit its usage cap.';
      case 'ended':
        return 'None of their offers has ended yet.';
      default:
        return 'This vendor has never created an offer.';
    }
  }

  switch (tab) {
    case 'live':
      return 'No offers are running right now. Nothing is being shown to clients.';
    case 'suspended':
      return 'Nothing has been withdrawn. Offers you take down appear here so you can restore them.';
    case 'scheduled':
      return 'No offers are queued to start.';
    case 'paused':
      return 'No vendor has paused an offer.';
    case 'exhausted':
      return 'No offer has hit its usage cap.';
    case 'ended':
      return 'No offers have ended yet.';
    default:
      return 'No offers have been created on the platform yet.';
  }
}
