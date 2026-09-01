import { useMemo } from 'react';
import { useVendorEventQuotations } from '@/hooks/queries';
import { quoteStanding, unsentQuoteCount } from '../schema';

/**
 * This vendor's quotes against the event, and where they leave them standing.
 *
 * The standing is derived once here rather than in each section, because three
 * surfaces ask the same question and must not answer it differently: the hero's
 * call to action, the Quote tab's badge, and the per-line buttons on the plan.
 *
 * `byRequirement` exists so a line can ask about itself in constant time. A
 * quote with no `requirement_id` is the event-wide one — `express_event_interest`
 * opens it that way when a vendor volunteers without naming a line — and it is
 * deliberately not attributed to any line, or a single loose quote would make
 * every row on the plan claim to be answered.
 */
export function useVendorEventQuotes(vendorId: string | undefined, eventId: string) {
  const { data, isLoading, error } = useVendorEventQuotations(vendorId, eventId);

  return useMemo(() => {
    const rows = data ?? [];
    const byRequirement = new Map<string, typeof rows>();

    for (const quote of rows) {
      if (!quote.requirement_id) continue;
      const bucket = byRequirement.get(quote.requirement_id);
      if (bucket) bucket.push(quote);
      else byRequirement.set(quote.requirement_id, [quote]);
    }

    return {
      rows,
      isLoading,
      error,
      byRequirement,
      standing: quoteStanding(rows),
      unsentCount: unsentQuoteCount(rows),
    };
  }, [data, isLoading, error]);
}
