import { useMemo } from 'react';
import { useEventRequirementsPublic } from '@/hooks/queries';
import type { PublicEventRequirementModel } from '@/lib/types';

/** A plan line, plus whether this vendor is allowed anywhere near it. */
export type PlanLine = PublicEventRequirementModel & {
  /** Mirrors `vendor_serves_category` — see `useVendorCategories`. */
  serves: boolean;
};

/**
 * The client's plan as a vendor may read it: what they still need, what is
 * already covered, and which of it is their line of work.
 *
 * THREE ORDERING RULES, and each earns its place.
 *
 * Open lines come first. A vendor opening the plan is looking for work they can
 * take, and a list that leads with three filled lines buries the one they could
 * have quoted for — while dropping the filled ones entirely would misrepresent
 * the size of the job and make a two-line event look like the whole brief.
 *
 * Within the open group, lines the vendor actually serves come first. A
 * photographer reading a twelve-line wedding should not have to scan past
 * catering, security and florists to find the one row with a button on it.
 *
 * Beyond that the client's own ordering is kept: the RPC sorts by `sort_order`,
 * which is the order they wrote the plan in, and both partitions below are
 * stable so that survives.
 *
 * `openCount` — the tab's badge — counts only the open lines this vendor may
 * quote for. Counting every open line would badge a makeup-only event with a
 * "3" for a photographer and send them to a tab where nothing can be done,
 * which is the same mistake in miniature as the gate this page now enforces.
 */
export function useEventPlan(eventId: string, serves: (categoryId: string | null) => boolean) {
  const { data, isLoading, error } = useEventRequirementsPublic(eventId);

  return useMemo(() => {
    const rows: PlanLine[] = (data ?? []).map((row) => ({
      ...row,
      serves: serves(row.category_id),
    }));

    const open = rows.filter((row) => row.is_open);
    const filled = rows.filter((row) => !row.is_open);
    // Array.prototype.filter is stable, so partitioning by `serves` preserves
    // the client's sort_order inside each half.
    const openForYou = open.filter((row) => row.serves);

    return {
      rows,
      open: [...openForYou, ...open.filter((row) => !row.serves)],
      filled,
      isLoading,
      error,
      isEmpty: rows.length === 0,
      /** Open lines this vendor may actually quote for. */
      openCount: openForYou.length,
      /**
       * Whether anything on this event is open to this vendor at all — the
       * browser-side reading of the event-wide branch of `express_event_interest`.
       * An event with NO plan is open to everyone: there is no category to judge
       * against, and the whole brief is the ask.
       */
      hasAnythingForYou: rows.length === 0 || openForYou.length > 0,
    };
  }, [data, isLoading, error, serves]);
}
