import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  EscrowJourney,
  Stack,
  StatusChip,
  Typography,
} from '@sinnapi/ui';
import LaunchIcon from '@mui/icons-material/Launch';
import EscrowActions from '@/components/escrow/EscrowActions';
import { formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { EscrowModel, VendorNameRefModel, BookingRefModel } from '@/lib/types';

type Props = { escrow: EscrowModel };

/**
 * One escrow, summarised.
 *
 * The headline figure is what the client *paid*, not what the vendor gets —
 * on this screen they are asking "where is my money", and the gross is the
 * number they recognise from their bank statement.
 */
export default function EscrowCard({ escrow: e }: Props) {
  const vendor = one<VendorNameRefModel>(e.vendors)?.business_name ?? 'Vendor';
  const bookingRef = one<BookingRefModel>(e.bookings)?.reference_no;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ sm: 'flex-start' }}
          spacing={2}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" noWrap>
              {vendor}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Booking {bookingRef ?? '—'}
            </Typography>
          </Box>

          <Stack spacing={0.75} alignItems={{ xs: 'flex-start', sm: 'flex-end' }}>
            <Typography variant="h6">{formatMoney(e.gross_amount, e.currency)}</Typography>
            <StatusChip status={e.status} />
          </Stack>
        </Stack>

        <Box sx={{ my: 2.5 }}>
          <EscrowJourney
            status={e.status}
            currency={e.currency ?? 'UGX'}
            grossAmount={e.gross_amount}
            advanceAmount={e.advance_amount}
            balanceAmount={e.balance_amount}
            advanceDueAt={e.advance_release_due_at}
            autoReleaseAt={e.auto_release_due_at}
          />
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          sx={{ gap: 1 }}
        >
          <EscrowActions escrowId={e.id} status={e.status} />
          {e.booking_id && (
            <Button
              component={RouterLink}
              to={`/bookings/${e.booking_id}`}
              size="small"
              variant="text"
              endIcon={<LaunchIcon />}
            >
              View booking
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
