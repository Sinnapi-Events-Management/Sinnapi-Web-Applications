import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, HeroSurface, Stack, StatusChip, Typography } from '@sinnapi/ui';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { formatMoney } from '@/lib/config';
import type { PaymentAdminDetailModel } from '@/lib/types';
import { purposeLabel } from '@/pages/payments/schema';
import PaymentHeroMeta from '../molecules/PaymentHeroMeta';

type Props = { payment: PaymentAdminDetailModel };

/**
 * Banner header: how much, where it stands, what it was for and who paid.
 *
 * A payment has no human reference of its own — the booking and the provider
 * both have one, the payment is the thing between them — so the amount leads,
 * because it is the fact every other question about a payment is asked
 * against, and the purpose and payer follow as the one-line answer to "which
 * one".
 */
export default function PaymentHero({ payment: p }: Props) {
  return (
    <HeroSurface>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{ position: 'relative', minWidth: 0 }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{ lineHeight: 1.15, fontSize: { xs: '1.375rem', sm: '2.125rem' } }}
            >
              {formatMoney(p.amount, p.currency)}
            </Typography>
            <StatusChip status={p.status} size="medium" />
          </Stack>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.25 }}>
            {purposeLabel(p.purpose)} · {p.payer.name ?? 'Unknown payer'}
          </Typography>
        </Box>

        <Button
          component={RouterLink}
          to="/payments"
          variant="text"
          color="inherit"
          startIcon={<ArrowBackIcon />}
          sx={{ flexShrink: 0 }}
        >
          All payments
        </Button>
      </Stack>

      <PaymentHeroMeta payment={p} />
    </HeroSurface>
  );
}
