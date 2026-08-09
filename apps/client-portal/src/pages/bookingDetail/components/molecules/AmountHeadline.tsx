import { Stack, Typography, Chip } from '@sinnapi/ui';
import { formatMoney, titleize } from '@/lib/config';

type Props = {
  amount: number | null;
  currency: string | null;
  paymentType: string | null;
};

/**
 * The booking's money, stated once and large. The payment type rides beneath it
 * as a chip rather than a labelled row: until the client picks one it reads
 * "Not selected", which is a prompt, not a fact.
 */
export default function AmountHeadline({ amount, currency, paymentType }: Props) {
  return (
    <Stack spacing={1} alignItems="flex-start">
      <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.1 }}>
        {formatMoney(amount, currency)}
      </Typography>
      <Chip
        size="small"
        variant={paymentType ? 'filled' : 'outlined'}
        label={paymentType ? titleize(paymentType) : 'Payment type not selected'}
      />
    </Stack>
  );
}
