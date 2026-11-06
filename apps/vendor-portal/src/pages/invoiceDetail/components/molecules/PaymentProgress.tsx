import { Alert, Box, LinearProgress, Stack, Typography } from '@sinnapi/ui';
import {
  PAYMENT_COVERAGE_META,
  formatDocumentMoney,
  paymentCoverageMessage,
  type PaymentCoverage,
} from '@sinnapi/ui/documents';

type Props = { coverage: PaymentCoverage; currency: string; receiptCount: number };

const BAR_COLOR = {
  unpaid: 'inherit',
  short: 'warning',
  exact: 'success',
  over: 'error',
} as const;

/**
 * How much of the invoice the receipts cover: a bar, the share in words,
 * and a flag when the receipts fall short of, match, or exceed the total.
 * The flag's colour is never the only signal — its title says it too.
 */
export default function PaymentProgress({ coverage, currency, receiptCount }: Props) {
  const meta = PAYMENT_COVERAGE_META[coverage.state];
  const paid = formatDocumentMoney(coverage.paid, currency);
  const total = formatDocumentMoney(coverage.total, currency);
  const instalments = receiptCount === 1 ? '1 payment' : `${receiptCount} payments`;

  return (
    <Stack spacing={1.25}>
      <Box>
        <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ mb: 0.75 }}>
          <Typography variant="caption" color="text.secondary">
            {paid} of {total}
          </Typography>
          {receiptCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              {instalments}
            </Typography>
          )}
        </Stack>
        <LinearProgress
          variant="determinate"
          value={coverage.percent}
          color={BAR_COLOR[coverage.state]}
          aria-label={`${Math.round(coverage.percent)}% of the invoice paid`}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>
      {coverage.state !== 'unpaid' && (
        <Alert severity={meta.severity} variant="outlined" sx={{ py: 0.25 }}>
          <Typography variant="body2" fontWeight={700} component="span">
            {meta.label}.{' '}
          </Typography>
          <Typography variant="body2" component="span">
            {paymentCoverageMessage(coverage, currency)}
          </Typography>
        </Alert>
      )}
    </Stack>
  );
}
