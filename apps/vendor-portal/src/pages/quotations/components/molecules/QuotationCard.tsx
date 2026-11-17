import { Box, Skeleton, RecordCard, StatusChip, Typography } from '@sinnapi/ui';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { formatDate, formatMoney } from '@/lib/config';
import { relativeDay } from '@/lib/bookingCopy';
import { quoteListHint, requestSnippet } from '@/lib/quoteCopy';
import type { QuotationBookingModel, VendorQuotationModel } from '@/lib/types';

type Props = {
  quotation: VendorQuotationModel;
  clientName: string | null;
  booking: QuotationBookingModel | null;
  onOpen: () => void;
};

/**
 * One quote on a phone: who, what they asked for, when the event is, the
 * price (or that there is none yet) and the one thing to do about it. The
 * code and valid-until date live on the quote page.
 */
export default function QuotationCard({ quotation: q, clientName, booking, onOpen }: Props) {
  const what = requestSnippet(q.request_details);
  const when = relativeDay(q.event_on);
  const hint = quoteListHint({ ...q, hasBooking: !!booking });

  return (
    <RecordCard
      title={clientName ?? <Skeleton width={120} />}
      amount={q.total ? formatMoney(q.total, q.currency) : 'Not priced yet'}
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
          {q.event_on
            ? `Event ${formatDate(q.event_on)}${when ? ` · ${when}` : ''}`
            : 'No event date'}
        </>
      }
      chip={<StatusChip status={q.status} domain="quotation" />}
      footer={
        hint && (
          <Typography
            variant="body2"
            fontWeight={700}
            color={hint.urgent ? 'secondary.dark' : 'text.secondary'}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            {hint.urgent && <ArrowForwardIcon sx={{ fontSize: 18 }} />}
            {hint.text}
          </Typography>
        )
      }
      onClick={onOpen}
    />
  );
}
