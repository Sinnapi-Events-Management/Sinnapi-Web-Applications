import { useCallback, useMemo } from 'react';
import { quotationPricing, quoteVariance } from '@sinnapi/ui';
import { useVendorContext } from '@/vendor/VendorProvider';
import { one } from '@/lib/rel';
import { downloadQuotationPdf } from '@sinnapi/utils/quotationPdf';
import type {
  BookingQuotationModel,
  DirectoryProfile,
  QuotationItemModel,
  VendorBookingDetailModel,
} from '@/lib/types';

/**
 * The quotation behind a booking, resolved for display.
 *
 * All the deciding happens here so the card below is layout only: whether
 * there is a quotation at all, what its lines add up to, how that compares to
 * what the booking is actually for, and what the download hands over.
 *
 * The total comes from `quotationPricing` rather than the stored column. A
 * quote whose `total` was never written back reads as free, and a vendor
 * looking at their own work priced at nothing is the one figure on this page
 * that must never be shown when it is not true — the line items are the
 * evidence and they win.
 */
export function useBookingQuotation(
  booking: VendorBookingDetailModel,
  client: DirectoryProfile | null,
) {
  const quotation = one<BookingQuotationModel>(booking.quotations);
  // The vendor's own name for the document header — already in context on
  // every page of this portal, so no extra read to render the PDF.
  const { vendor } = useVendorContext();

  const items = useMemo<QuotationItemModel[]>(() => {
    const rows = quotation?.quotation_items ?? [];
    // `sort_order` is the arrangement the vendor built; PostgREST does not
    // guarantee the embed comes back in it. Ties fall back to insertion order.
    return [...rows].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [quotation?.quotation_items]);

  const pricing = useMemo(() => quotationPricing(quotation, items), [quotation, items]);

  /** The quoted total against what the booking is actually for. */
  const variance = useMemo(
    () => quoteVariance(pricing.total, booking.amount),
    [pricing.total, booking.amount],
  );

  const download = useCallback(() => {
    if (!quotation) return;
    downloadQuotationPdf({
      id: quotation.id,
      reference_no: quotation.reference_no,
      status: quotation.status,
      currency: pricing.currency,
      subtotal: pricing.subtotal,
      discount_total: pricing.discount,
      tax_total: pricing.tax,
      total: pricing.total,
      valid_until: quotation.valid_until,
      sent_at: quotation.sent_at,
      created_at: quotation.created_at,
      vendor_name: vendor?.business_name ?? null,
      client_name: client?.full_name ?? null,
      event_title: one(booking.events)?.title ?? null,
      items,
      // Now that the document has somewhere to put them: the brief the quote
      // answers, and the advance terms that qualify the total it states.
      request_details: quotation.request_details,
      version_no: quotation.version_no,
      advance_rate: quotation.advance_rate,
      advance_release_days_before: quotation.advance_release_days_before,
      advance_terms_note: quotation.advance_terms_note,
    });
  }, [quotation, pricing, vendor, client, booking.events, items]);

  return {
    /** Null on a booking placed straight against a service — the card is then absent. */
    quotation,
    items,
    pricing,
    variance,
    download,
  };
}
