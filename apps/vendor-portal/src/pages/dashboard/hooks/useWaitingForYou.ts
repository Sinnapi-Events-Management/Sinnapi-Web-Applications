import { useMemo } from 'react';
import {
  useProfileDirectory,
  useVendorBookings,
  useVendorQuotations,
  useVendorReviews,
} from '@/hooks/queries';
import { requestSnippet } from '@/lib/quoteCopy';
import { formatDate } from '@/lib/config';

export type WaitingItem = {
  id: string;
  name: string;
  /** What they want, in one short line. */
  line: string;
  /** The verb on the right: Reply / Price / Update / Answer. */
  action: string;
  to: string;
  clientId: string | null;
};

const FIVE = { page: 0, pageSize: 5 } as const;

/**
 * The actual people waiting on the vendor — booking requests, quotes to price
 * or update, and reviews without a reply — as one list, most urgent first, like a
 * WhatsApp chat list. Chosen 2026-11-17 over count tiles ("3 Booking re…").
 * Each source is capped at five; `total` is the real count for "See all".
 */
export function useWaitingForYou(vendorId: string | undefined) {
  const bookings = useVendorBookings(vendorId, {
    ...FIVE,
    sort: { field: 'event_date', direction: 'asc' },
    filters: { status: 'requested' },
  });
  const toPrice = useVendorQuotations(vendorId, {
    ...FIVE,
    sort: { field: 'created_at', direction: 'desc' },
    filters: { status: 'requested' },
  });
  const changes = useVendorQuotations(vendorId, {
    ...FIVE,
    sort: { field: 'created_at', direction: 'desc' },
    filters: { status: 'revised' },
  });
  const reviews = useVendorReviews(vendorId);

  const unanswered = useMemo(
    () =>
      (reviews.data ?? []).filter((r) =>
        Array.isArray(r.review_responses) ? r.review_responses.length === 0 : !r.review_responses,
      ),
    [reviews.data],
  );

  const raw = useMemo(() => {
    const out: WaitingItem[] = [];
    for (const b of bookings.data?.rows ?? []) {
      out.push({
        id: `b-${b.id}`,
        name: '',
        clientId: b.client_id,
        line: b.event_date ? `Wants to book ${formatDate(b.event_date)}` : 'Wants to book you',
        action: 'Reply',
        to: `/bookings/${b.id}`,
      });
    }
    for (const q of toPrice.data?.rows ?? []) {
      out.push({
        id: `q-${q.id}`,
        name: '',
        clientId: q.client_id,
        line: requestSnippet(q.request_details, 48) ?? 'Asked for a price',
        action: 'Price',
        to: `/quotations/${q.id}`,
      });
    }
    for (const q of changes.data?.rows ?? []) {
      out.push({
        id: `c-${q.id}`,
        name: '',
        clientId: q.client_id,
        line: 'Asked for changes to your quote',
        action: 'Update',
        to: `/quotations/${q.id}`,
      });
    }
    for (const r of unanswered.slice(0, 5)) {
      out.push({
        id: `r-${r.id}`,
        name: '',
        clientId: r.client_id,
        line: `Left you ${r.rating} star${r.rating === 1 ? '' : 's'}`,
        action: 'Answer',
        to: '/reviews',
      });
    }
    return out;
  }, [bookings.data, toPrice.data, changes.data, unanswered]);

  const { profiles } = useProfileDirectory(raw.map((i) => i.clientId));

  const items = useMemo(
    () =>
      raw
        // Order is by urgency, not time: a date someone wants held comes
        // first, then changes asked, new prices, and reviews.
        .map((i) => ({
          ...i,
          name: (i.clientId && profiles[i.clientId]?.full_name) || 'A client',
        })),
    [raw, profiles],
  );

  return {
    items,
    total:
      (bookings.data?.total ?? 0) +
      (toPrice.data?.total ?? 0) +
      (changes.data?.total ?? 0) +
      unanswered.length,
    isLoading: bookings.isLoading || toPrice.isLoading || changes.isLoading || reviews.isLoading,
  };
}
