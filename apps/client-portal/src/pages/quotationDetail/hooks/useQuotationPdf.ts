import { useCallback, useMemo } from 'react';
import { usePdfDocument, type QuotationPricing } from '@sinnapi/ui';
import { canDownloadQuotation } from '@sinnapi/utils/quotationPdf/access';
import type { QuotationPdfDocument } from '@sinnapi/utils/quotationPdf';
import { useProfile } from '@/hooks/queries';
import type {
  EventRefModel,
  QuotationDetailModel,
  QuotationItemModel,
  VendorRefModel,
} from '@/lib/types';

type Input = {
  quotation: QuotationDetailModel | null | undefined;
  items: QuotationItemModel[];
  pricing: QuotationPricing;
  vendor: VendorRefModel | null | undefined;
  event: EventRefModel | null | undefined;
};

/**
 * "Preview" and "Download PDF" on the quotation page: offered once the vendor has sent
 * the quote, headed with the vendor's business logo.
 *
 * The document is assembled from what the page shows (`quotationPricing`
 * totals included), so the file never disagrees with the screen. The PDF
 * renderer — jsPDF with it — is imported on the first click, never with the
 * page.
 */
export function useQuotationPdf({ quotation, items, pricing, vendor, event }: Input) {
  const { data: profile } = useProfile();
  const doc = useMemo<QuotationPdfDocument | null>(() => {
    if (!quotation) return null;
    return {
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
      vendor_logo_url: vendor?.primary_image_url ?? null,
      client_name: profile?.full_name ?? null,
      event_title: event?.title ?? null,
      items,
      request_details: quotation.request_details,
      version_no: quotation.version_no,
      advance_rate: quotation.advance_rate,
      advance_release_days_before: quotation.advance_release_days_before,
      advance_terms_note: quotation.advance_terms_note,
    };
  }, [quotation, pricing, vendor, profile, event, items]);

  const render = useCallback(async () => {
    if (!doc) throw new Error('No quotation to render.');
    return (await import('@sinnapi/utils/quotationPdf')).renderQuotationPdf(doc);
  }, [doc]);

  return usePdfDocument({
    enabled: canDownloadQuotation(quotation, items.length, 'client'),
    fileName: `quotation-${quotation?.reference_no ?? quotation?.id ?? 'document'}.pdf`,
    render,
  });
}
