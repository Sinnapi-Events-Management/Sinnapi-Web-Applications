import { useParams } from 'react-router-dom';
import { useMyEvent, useEventBudget } from '@/hooks/queries';

/**
 * Everything the event page reads: the event itself, and its budget standing.
 *
 * The two are separate reads because they are separate things — the event is a
 * row, the budget is a rollup over bookings and quotations — and keeping them
 * apart is what lets the page paint the event immediately while the money is
 * still being summed.
 *
 * `isLoading` therefore follows the EVENT only. Gating the whole page on the
 * budget would mean a client who deep-links here waits on an aggregate to see
 * the title of their own event; the budget card shows its own loading state
 * instead, which is the one part of the page that is actually waiting.
 *
 * `notFound` is distinguished from "still loading" so the page can say the
 * event is gone rather than spinning forever on a bad id — `maybeSingle`
 * resolves to null rather than throwing, so without this the two states look
 * identical.
 */
export function useEventDetail() {
  const { id = '' } = useParams();
  const event = useMyEvent(id);
  const budget = useEventBudget(id);

  return {
    id,
    event: event.data ?? null,
    notFound: !event.isLoading && !event.error && !event.data,
    budget: budget.data ?? null,
    budgetLoading: budget.isLoading,
    budgetError: budget.error,
    isLoading: event.isLoading,
    error: event.error,
  };
}
