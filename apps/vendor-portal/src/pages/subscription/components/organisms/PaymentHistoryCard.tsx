import { Box, Divider, SectionCard, Skeleton, Stack, StatusChip, Typography } from '@sinnapi/ui';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { checkoutRailLabel, describePaymentFailure } from '@sinnapi/ui/payments';
import { formatDateTime, formatMoney } from '@/lib/config';
import type { SubscriptionPaymentModel } from '@/lib/types';

type Props = {
  payments: SubscriptionPaymentModel[];
  isLoading: boolean;
};

/**
 * Every payment made against the subscription, newest first — what was
 * paid, for which plan, on which rail, and whether it went through.
 *
 * A failed row shows its reason in the same words the notification used, so
 * the page and the inbox agree.
 */
export default function PaymentHistoryCard({ payments, isLoading }: Props) {
  return (
    <SectionCard
      title="Payment history"
      icon={<ReceiptLongIcon />}
      subtitle="Every subscription payment on this account."
    >
      {isLoading ? (
        <Stack spacing={1}>
          <Skeleton height={28} />
          <Skeleton height={28} />
        </Stack>
      ) : payments.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No payments yet.
        </Typography>
      ) : (
        <Stack divider={<Divider flexItem />} spacing={1.5}>
          {payments.map((p) => (
            <Stack
              key={p.id}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ sm: 'center' }}
              justifyContent="space-between"
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {p.target_plan?.name ?? 'Plan'} · {formatMoney(p.amount, p.currency)}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {formatDateTime(p.paid_at ?? p.created_at)} ·{' '}
                  {checkoutRailLabel(p.provider, p.provider_method)}
                  {p.provider_ref ? ` · ref ${p.provider_ref}` : ''}
                </Typography>
                {p.status === 'failed' && (
                  <Typography variant="caption" color="error.main" display="block">
                    {describePaymentFailure(p.status, p.failure_reason)}
                  </Typography>
                )}
              </Box>
              <StatusChip status={p.status} />
            </Stack>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}
