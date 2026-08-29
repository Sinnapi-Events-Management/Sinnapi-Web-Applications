import { useMemo } from 'react';
import { latestQuotationFeedbackFromEither } from '@sinnapi/ui';
import { useAuth } from '@/auth/AuthProvider';
import { useQuotationStatusHistory } from '@/hooks/queries';
import type { QuotationDetailModel } from '@/lib/types';

/**
 * The last thing said about this quote by either side.
 *
 * THE MIRROR IS NOT SYMMETRICAL, AND DELIBERATELY SO. The vendor's page shows
 * only what the client wrote — their own withdrawal note is not news to them.
 * This one shows either author, because the client's most common unanswered
 * question is about a note they wrote themselves: a quote stuck at `revised` is
 * waiting on a rework *they* asked for, and days later "what did I ask for?" is
 * a real question whose answer was buried in the Progress tab. Echoing it back
 * with "you asked for changes" and the date is the whole point.
 *
 * Authorship survives on the result, so the callout words it as "you" or "the
 * vendor" rather than flattening the two — see `quotationFeedbackCopy`.
 *
 * The client id comes from the session rather than from the quotation row,
 * which does not carry one on this side. It is the same value: RLS scopes this
 * page to the caller's own quotations, so the viewer *is* the client on every
 * quote they can reach. Reading it from the row would mean widening the select
 * to re-learn who is already signed in.
 *
 * Reads the same `quotation_status_history` query the timeline card does. React
 * Query deduplicates them on the shared key, so the callout at the top of the
 * page and the trail at the bottom are one network read and cannot disagree.
 */
export function useQuotationFeedback(quotation: QuotationDetailModel | null | undefined) {
  const { user } = useAuth();
  const { data } = useQuotationStatusHistory(quotation?.id ?? '');

  return useMemo(
    () =>
      latestQuotationFeedbackFromEither(data, {
        clientId: user?.id,
        currentStatus: quotation?.status,
      }),
    [data, user?.id, quotation?.status],
  );
}
