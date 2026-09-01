import { useMyEvents as useMyEventsQuery, useMyEventBudgets } from '@/hooks/queries';

/**
 * The client's posted events, and the budget standing of each.
 *
 * Two reads rather than one, joined here by id. The events come from the table
 * and the budgets from an RPC that rolls up bookings and quotations, so they
 * cannot be one query — but they can be one *round trip each*, which is why the
 * budgets arrive for the whole collection at once rather than per card.
 *
 * The page is not blocked on the budgets. `isLoading` follows the events alone,
 * so the grid paints as soon as there are cards to paint and each meter fills
 * in when its figures land: the budget is the second thing a client reads on
 * this page, and holding the whole grid back for it would be trading the first
 * thing for the second. A card with no row yet simply renders no meter.
 */
export function useMyEvents() {
  const { data, isLoading, error } = useMyEventsQuery();
  const budgets = useMyEventBudgets();

  return {
    rows: data ?? [],
    isLoading,
    error,
    /** Budget rollups keyed by event id; empty until the second read lands. */
    budgets: budgets.data,
    budgetsLoading: budgets.isLoading,
  };
}
