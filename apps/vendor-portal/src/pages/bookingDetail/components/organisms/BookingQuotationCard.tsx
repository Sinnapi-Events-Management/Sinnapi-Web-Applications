import { Link as RouterLink } from 'react-router-dom';
import {
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
import type { DirectoryProfile, VendorBookingDetailModel } from '@/lib/types';
import { useBookingQuotation } from '../../hooks/useBookingQuotation';

type Props = {
  booking: VendorBookingDetailModel;
  /** For the PDF header; the card renders without it. */
  client: DirectoryProfile | null;
};

/**
 * The quote this booking came from, in full.
 *
 * A vendor accepting a booking is committing to work they priced weeks ago,
 * often across several quotes to several clients. Rendering the breakdown here
 * rather than linking to it is what lets them check the commitment against the
 * price without leaving the decision behind — the accept button is on this
 * page, so the evidence for it should be too.
 *
 * The whole card is absent on a booking placed straight against a service:
 * there is no quotation, and never was.
 *
 * Layout only — `useBookingQuotation` owns the pricing, the comparison and the
 * download.
 */
export default function BookingQuotationCard({ booking, client }: Props) {
  const { quotation, items, pricing, variance, download } = useBookingQuotation(booking, client);

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
          totalLabel="You quoted"
        />

        {/* Directly under the quoted total, because it is the same question
            asked twice: what was quoted, and what will actually be paid. */}
        <QuoteVarianceNote variance={variance} currency={pricing.currency} perspective="vendor" />

        {pricing.isPriced ? (
          <>
            <Divider />
            <QuotationLineItems items={items} pricing={pricing} totalLabel="You quoted" />
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            This quote carries no line items — the amount was agreed without a breakdown.
          </Typography>
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
