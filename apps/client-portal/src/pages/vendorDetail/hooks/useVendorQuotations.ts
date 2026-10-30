import { useMemo } from 'react';
import { isQuotationBookable } from '@sinnapi/ui';
import { useQuotationBookings, useQuotationsWithVendor } from '@/hooks/queries';
import { one } from '@/lib/rel';
import type { QuotationBookingModel, VendorQuotationModel } from '@/lib/types';

/**
 * The one thing the client can do next with a quote, decided from its status
 * and whether it has already been booked. Every row gets exactly one action so
 * the list never asks the client to choose between controls.
 *
 * - `booking`  the quote has been booked; go to the booking.
 * - `book`     accepted and unbooked; open the quote with the booking dialog.
 * - `answer`   sent and waiting on the client; open the quote to accept, decline
 *              or ask for changes.
 * - `view`     waiting on the vendor, or settled and closed; open the quote to read it.
 */
export type VendorQuoteNextStep = 'booking' | 'book' | 'answer' | 'view';

export type VendorQuoteRow = {
  quote: VendorQuotationModel;
  booking: QuotationBookingModel | null;
  event: { title: string | null; event_date: string | null } | null;
  next: VendorQuoteNextStep;
  /** Where the row's action leads. Kept here so the row never builds a path. */
  to: string;
};

function nextStepFor(quote: VendorQuotationModel, booking: QuotationBookingModel | null) {
  if (booking) return 'booking' as const;
  if (isQuotationBookable(quote.status)) return 'book' as const;
  if (quote.status === 'sent') return 'answer' as const;
  return 'view' as const;
}

/**
 * The client's quotes with this vendor, newest first, for the Quotations tab
 * and its badge.
 */
export function useVendorQuotations(vendorId?: string) {
  const { data, isLoading, error } = useQuotationsWithVendor(vendorId);
  const quotes = useMemo(() => data ?? [], [data]);

  // One query for every quote's booking, the same read the quotations list
  // makes. Without it a booked quote would offer "Create booking" here.
  const { bookings, isLoading: bookingsLoading } = useQuotationBookings(quotes.map((q) => q.id));

  const rows = useMemo<VendorQuoteRow[]>(() => {
    const built = quotes.map((quote) => {
      const booking = bookings[quote.id] ?? null;
      const next = nextStepFor(quote, booking);
      const to =
        next === 'booking'
          ? `/bookings/${booking!.id}`
          : next === 'book'
            ? `/quotations/${quote.id}?book=1`
            : `/quotations/${quote.id}`;

      return { quote, booking, event: one(quote.events), next, to };
    });

    // Newest first by when the quote was created. Sorted here rather than trusted
    // to the query's order, because this is the order the rows are shown in.
    return built.sort((a, b) => Date.parse(b.quote.created_at) - Date.parse(a.quote.created_at));
  }, [quotes, bookings]);

  return {
    rows,
    /** Whether the section has any quotes to list, or shows its empty state. */
    hasQuotations: rows.length > 0,
    /** Rows the client has to act on before anything else. */
    actionableCount: rows.filter((r) => r.next === 'book' || r.next === 'answer').length,
    // Loading until the bookings are in too. Otherwise a booked quote shows
    // "Create booking" for the instant before its booking arrives.
    isLoading: isLoading || bookingsLoading,
    error,
  };
}
