import { useMemo } from 'react';
import {
  Button,
  Divider,
  QuotationLineItems,
  QuotationSummaryRows,
  QuoteVarianceNote,
  SectionCard,
  Stack,
  StatusChip,
  quotationPricing,
  quoteVariance,
} from '@sinnapi/ui';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import DownloadIcon from '@mui/icons-material/Download';
import { downloadQuotationPdf } from '@sinnapi/utils/quotationPdf';
import type { BookingAdminModel, QuotationDocument } from '@/lib/types';

type Props = {
  quotation: QuotationDocument;
  /** The booking this quote became, for the comparison the card exists to make. */
  booking: BookingAdminModel;
};

/**
 * The quotation this booking came from, when there is one.
 *
 * Rendered rather than linked because the question it answers — "does the
 * booking amount match what was quoted?" — is one an operator is asking *about
 * this booking*, and sending them to another page to answer it loses the
 * comparison. Bookings placed directly against a service carry no quotation at
 * all, so the whole card is absent then.
 *
 * The rendering is `@sinnapi/ui`'s, shared with both portals: an operator
 * reading a quote during a dispute and the two parties arguing about it must
 * be looking at the same document, laid out the same way. The download reuses
 * `downloadQuotationPdf` unchanged — `get_booking_admin` returns the quotation
 * in the same shape `get_event_quotation` does, so one renderer serves both
 * pages.
 */
export default function BookingQuotationCard({ quotation: q, booking }: Props) {
  const pricing = useMemo(() => quotationPricing(q, q.items), [q]);
  const variance = useMemo(
    () => quoteVariance(pricing.total, booking.amount),
    [pricing.total, booking.amount],
  );

  return (
    <SectionCard
      title="Quotation"
      icon={<RequestQuoteIcon />}
      accent="info"
      action={<StatusChip status={q.status} />}
    >
      <Stack spacing={2.5}>
        <QuotationSummaryRows quotation={q} total={pricing.total} currency={pricing.currency} />

        {/* Directly under the quoted total: the booking was created at that
            figure, so any gap was opened afterwards and is worth chasing. */}
        <QuoteVarianceNote variance={variance} currency={pricing.currency} perspective="admin" />

        {q.items.length > 0 && (
          <>
            <Divider />
            <QuotationLineItems items={q.items} pricing={pricing} />
          </>
        )}

        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => downloadQuotationPdf(q)}
          sx={{ alignSelf: 'flex-start' }}
        >
          Download quotation
        </Button>
      </Stack>
    </SectionCard>
  );
}
