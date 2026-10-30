import { Box, Button, Stack, StatusChip, Typography } from '@sinnapi/ui';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { formatDate, formatMoney } from '@/lib/config';
import type { VendorQuoteRow, VendorQuoteNextStep } from '../../hooks/useVendorQuotations';

type Props = {
  row: VendorQuoteRow;
  onOpen: (to: string) => void;
};

const ACTION_LABEL: Record<VendorQuoteNextStep, string> = {
  booking: 'View booking',
  book: 'Create booking',
  answer: 'Review quote',
  view: 'View quote',
};

/**
 * What the client is waiting on, in the client's words. The status chip says
 * where the quote is; this line says whose turn it is, which is the part the
 * quotations list never made obvious.
 */
const WAITING_NOTE: Record<string, string> = {
  requested: 'Sent to the vendor — waiting for their quote',
  draft: 'The vendor is preparing this quote',
  revised: 'You asked for changes — waiting for the vendor',
  declined: 'Declined',
  expired: 'This quote has expired',
  voided: 'This quote was withdrawn',
};

function noteFor(row: VendorQuoteRow): string {
  switch (row.next) {
    case 'booking':
      return row.booking?.reference_no ? `Booking ${row.booking.reference_no}` : 'Booked';
    case 'book':
      return 'Accepted — ready to book';
    case 'answer':
      return row.quote.valid_until
        ? `Respond by ${formatDate(row.quote.valid_until)}`
        : 'Waiting for your answer';
    case 'view':
      return WAITING_NOTE[row.quote.status] ?? '';
  }
}

/**
 * One quote in the vendor's "your quotes" strip.
 *
 * One action per row, and it is the one that moves the quote forward. The
 * primary button is reserved for the two states that need the client — book an
 * accepted quote, or answer a sent one. Everything else gets an outlined button
 * so a row that is simply waiting on the vendor does not look like a to-do.
 */
export default function VendorQuoteListItem({ row, onOpen }: Props) {
  const { quote, event, next } = row;
  const needsClient = next === 'book' || next === 'answer';
  const title = event?.title ?? quote.reference_no ?? 'Quote';

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 1.5, sm: 2 }}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      sx={{ py: 2, px: { xs: 2, sm: 2.5 } }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
        <Box
          aria-hidden
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            bgcolor: 'action.hover',
            color: 'text.secondary',
          }}
        >
          {next === 'booking' ? (
            <EventAvailableIcon fontSize="small" />
          ) : (
            <ReceiptLongOutlinedIcon fontSize="small" />
          )}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" component="p" noWrap>
            {[quote.reference_no, event?.event_date ? formatDate(event.event_date) : null]
              .filter(Boolean)
              .join(' · ') || '—'}
          </Typography>
          <Typography
            variant="caption"
            component="p"
            sx={{ color: needsClient ? 'warning.dark' : 'text.secondary', mt: 0.25 }}
          >
            {noteFor(row)}
          </Typography>
        </Box>
      </Stack>

      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        justifyContent="space-between"
        sx={{ flexShrink: 0 }}
      >
        <Stack spacing={0.5} alignItems={{ xs: 'flex-start', sm: 'flex-end' }}>
          <StatusChip status={quote.status} />
          <Typography variant="subtitle2">{formatMoney(quote.total, quote.currency)}</Typography>
        </Stack>

        <Button
          size="small"
          variant={needsClient ? 'contained' : 'outlined'}
          color="primary"
          disableElevation
          onClick={() => onOpen(row.to)}
          sx={{ whiteSpace: 'nowrap', minWidth: 120 }}
        >
          {ACTION_LABEL[next]}
        </Button>
      </Stack>
    </Stack>
  );
}
