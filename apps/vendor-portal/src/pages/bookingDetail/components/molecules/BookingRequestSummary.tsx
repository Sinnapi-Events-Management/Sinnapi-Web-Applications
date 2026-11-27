import { Box, Typography, railLabelFor } from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import type { VendorBookingDetailModel } from '@/lib/types';

type Props = { booking: VendorBookingDetailModel; timeWindow: string | null };

/**
 * What the vendor is agreeing to, right above the Accept button. These used to
 * sit behind the Money tab, so "Accept date and terms" accepted terms the
 * vendor had not been shown.
 */
export default function BookingRequestSummary({ booking: b, timeWindow }: Props) {
  const rail = b.payment_type === 'escrow' || b.payment_type === 'direct' ? b.payment_type : null;
  const rows: [string, string][] = [
    ['Date', [formatDate(b.event_date), timeWindow].filter(Boolean).join(', ')],
    ['Place', b.location || '—'],
    ['Amount', formatMoney(b.amount, b.currency)],
    ['How you get paid', rail ? railLabelFor(rail, 'vendor') : 'Not chosen yet'],
  ];
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        mb: 2,
        p: 1.75,
        borderRadius: 2,
        bgcolor: 'action.hover',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        columnGap: 2,
        rowGap: 1,
      }}
    >
      {rows.map(([k, v]) => (
        <Box key={k} sx={{ display: 'contents' }}>
          <Typography component="dt" variant="body2" color="text.secondary">
            {k}
          </Typography>
          <Typography
            component="dd"
            variant="body2"
            fontWeight={700}
            sx={{ m: 0, textAlign: 'right', overflowWrap: 'anywhere' }}
          >
            {v}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
