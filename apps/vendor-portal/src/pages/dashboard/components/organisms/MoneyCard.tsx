import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, InfoTip, Skeleton, Stack, Typography } from '@sinnapi/ui';
import { ESCROW_EXPLAINER, formatMoney } from '@/lib/config';
import type { EarningsModel } from '@/data/overview';

type Props = {
  earnings: EarningsModel | undefined;
  /** Unpaid invoice balance, in UGX; null when there are no invoices. */
  owed: number | null;
  isLoading: boolean;
};

function Line({
  label,
  value,
  tip,
  to,
}: {
  label: React.ReactNode;
  value: string;
  tip?: string;
  to: string;
}) {
  return (
    <Stack
      component={RouterLink}
      to={to}
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      spacing={2}
      sx={{
        px: 2,
        py: 1.5,
        color: 'inherit',
        textDecoration: 'none',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography color="text.secondary">{label}</Typography>
        {tip && <InfoTip title={tip} label="What does this mean?" />}
      </Stack>
      <Typography
        fontWeight={700}
        sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

/**
 * Your money in three plain lines, each opening the page behind it. Replaces
 * "PAID TO YOU · LAST 30 DAYS" with escrow jargon underneath.
 */
export default function MoneyCard({ earnings, owed, isLoading }: Props) {
  return (
    <Box component="section" aria-labelledby="money-title" sx={{ mb: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography id="money-title" variant="h6" component="h2" fontWeight={700}>
          Your money
        </Typography>
        <Button component={RouterLink} to="/analytics" size="small">
          More numbers
        </Button>
      </Stack>
      {isLoading || !earnings ? (
        <Skeleton variant="rounded" height={150} />
      ) : (
        <Card variant="outlined">
          <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
            <Line
              label="Paid to you (last 30 days)"
              value={formatMoney(earnings.released)}
              to="/payouts"
            />
            <Line
              label="Held by Sinnapi"
              value={formatMoney(earnings.inEscrow)}
              tip={ESCROW_EXPLAINER}
              to="/escrow"
            />
            {owed !== null && (
              <Line label="Owed on your invoices" value={formatMoney(owed)} to="/invoices" />
            )}
          </Stack>
        </Card>
      )}
    </Box>
  );
}
