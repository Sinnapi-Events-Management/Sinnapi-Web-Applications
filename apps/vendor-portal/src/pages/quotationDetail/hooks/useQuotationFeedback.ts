import { useMemo } from 'react';
import { latestQuotationFeedback } from '@sinnapi/ui';
import { useQuotationStatusHistory } from '@/hooks/queries';
import type { QuotationDetailModel } from '@/lib/types';

/**
 * The last thing the client said about this quote, if they said anything.
 *
 * Reads the same `quotation_status_history` query the timeline card does, so
 * the callout at the top of the page and the trail at the bottom are one
 * network read and can never disagree about what happened. React Query
 * deduplicates them on the shared key; nothing here fetches twice.
 *
 * `isLoading` is deliberately not surfaced. A skeleton where a callout might go
 * is a page that jumps once the history lands, and the thing being waited for
 * usually does not exist — most quotes have no feedback on them at all. It
 * appears when it appears, under the hero, which is stable.
 */
export function useQuotationFeedback(quotation: QuotationDetailModel | null | undefined) {
  const { data } = useQuotationStatusHistory(quotation?.id ?? '');

  return useMemo(
    () =>
      latestQuotationFeedback(data, {
        clientId: quotation?.client_id,
        currentStatus: quotation?.status,
        viewer: 'vendor',
      }),
    [data, quotation?.client_id, quotation?.status],
  );
}
