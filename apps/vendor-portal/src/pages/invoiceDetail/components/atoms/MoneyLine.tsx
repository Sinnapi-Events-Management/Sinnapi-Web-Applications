import { Stack, Typography } from '@sinnapi/ui';

type Props = {
  label: string;
  value: string;
  /** The line that matters most (what is owed, or overpaid) reads larger. */
  strong?: boolean;
  tone?: 'default' | 'warning' | 'success';
};

const TONE = { default: 'text.primary', warning: 'warning.main', success: 'success.main' } as const;

/** "Paid ........ UGX 100,000" — a label and an amount on one line, figures aligned. */
export default function MoneyLine({ label, value, strong, tone = 'default' }: Props) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
      <Typography
        color={strong ? 'text.primary' : 'text.secondary'}
        fontWeight={strong ? 700 : 400}
      >
        {label}
      </Typography>
      <Typography
        variant={strong ? 'h6' : 'body1'}
        fontWeight={strong ? 700 : 400}
        color={TONE[tone]}
        sx={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right', overflowWrap: 'anywhere' }}
      >
        {value}
      </Typography>
    </Stack>
  );
}
