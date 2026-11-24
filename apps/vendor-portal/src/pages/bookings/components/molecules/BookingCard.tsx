import { Box, Skeleton, PaymentWindowChip, RecordCard, StatusChip, Typography } from '@sinnapi/ui';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { formatDate, formatMoney } from '@/lib/config';
import { bookingListHint, relativeDay } from '@/lib/bookingCopy';
import type { VendorBookingModel } from '@/lib/types';

type Props = {
  booking: VendorBookingModel;
  /** `null` while the name is loading. */
  clientName: string | null;
  /** The service or event this booking is for, when known. */
  what: string | null;
  onOpen: () => void;
};

/**
 * One booking on a phone: who, for what, when (and how far away), how much,
 * where it stands — and, when there is one, the single thing to do about it.
 * The reference code is left to the booking page; nobody scans a list by it.
 */
export default function BookingCard({ booking: b, clientName, what, onOpen }: Props) {
  const when = relativeDay(b.event_date);
  const hint = bookingListHint(b);

  return (
    <RecordCard
      title={clientName ?? <Skeleton width={120} />}
      amount={formatMoney(b.amount, b.currency)}
      meta={
        <>
          {what && (
            <Box
              component="span"
              sx={{
                display: 'block',
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {what}
            </Box>
          )}
          {formatDate(b.event_date)}
          {when && ` · ${when}`}
        </>
      }
      chip={<StatusChip status={b.status} domain="booking" />}
      footer={
        <>
          {/* Whether the client paid in time only matters while the job is open. */}
          {(b.status === 'requested' || b.status === 'confirmed' || b.status === 'in_progress') && (
            <PaymentWindowChip booking={b} audience="vendor" />
          )}
          {hint && (
            <Typography
              variant="body2"
              fontWeight={700}
              color={hint.urgent ? 'secondary.dark' : 'text.secondary'}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              {hint.urgent && <ArrowForwardIcon sx={{ fontSize: 18 }} />}
              {hint.text}
            </Typography>
          )}
        </>
      }
      onClick={onOpen}
    />
  );
}
