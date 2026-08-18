import { Link as RouterLink } from 'react-router-dom';
import {
  AdvanceTermsRows,
  Button,
  Divider,
  QuotationLineItems,
  QuotationSummaryRows,
  QuoteVarianceNote,
  SectionCard,
  Stack,
  StatusChip,
  Typography,
} from '@sinnapi/ui';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { BookingDetailModel } from '@/lib/types';
import { useBookingQuotation } from '../../hooks/useBookingQuotation';

type Props = { booking: BookingDetailModel };

/**
 * The quotation this booking was made from, in full.
 *
 * Rendered rather than linked because the question it answers — "is this what
 * I agreed to?" — is one the client is asking *about this booking*, and
 * sending them to another page to answer it loses the comparison. The link out
 * stays for the negotiation trail, which belongs to the quote rather than to
 * the booking.
 *
 * The whole card is absent on a booking placed straight against a service:
 * there is no quotation, and never was.
 *
 * Layout only — `useBookingQuotation` owns the pricing, the comparison and the
 * download.
 */
export default function BookingQuotationCard({ booking }: Props) {
  const { quotation, items, pricing, variance, download } = useBookingQuotation(booking);

  if (!quotation) return null;

  return (
    <SectionCard
      title="The quote behind this booking"
      icon={<RequestQuoteIcon />}
      accent="info"
      action={<StatusChip status={quotation.status} />}
    >
      <Stack spacing={2.5}>
        <QuotationSummaryRows
          quotation={quotation}
          total={pricing.total}
          currency={pricing.currency}
        />

        {/* Directly under the quoted total, because it is the same question
            asked twice: what was quoted, and what will be charged. */}
        <QuoteVarianceNote variance={variance} currency={pricing.currency} perspective="client" />

        {pricing.isPriced ? (
          <>
            <Divider />
            <QuotationLineItems items={items} pricing={pricing} />
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            This quote carries no line items — the amount was agreed without a breakdown.
          </Typography>
        )}

        {/* The schedule as it was proposed on the quote, which is not always
            the one the booking ended up on: the client may have moved the rate
            at checkout. The payment card owns what is actually happening; this
            is the record of what was offered. */}
        {quotation.advance_rate !== null && (
          <>
            <Divider />
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={700}>
                Payment schedule offered with this quote
              </Typography>
              <AdvanceTermsRows
                rate={quotation.advance_rate}
                daysBefore={quotation.advance_release_days_before}
                note={quotation.advance_terms_note}
                acceptedAt={booking.advance_terms_accepted_at}
                acceptedLabel="You accepted"
                currency={pricing.currency}
              />
            </Stack>
          </>
        )}

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={download}>
            Download quotation
          </Button>
          <Button
            component={RouterLink}
            to={`/quotations/${quotation.id}`}
            variant="text"
            startIcon={<OpenInNewIcon />}
          >
            Open the quote
          </Button>
        </Stack>
      </Stack>
    </SectionCard>
  );
}
