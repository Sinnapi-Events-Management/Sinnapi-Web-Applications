import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Divider, Skeleton, Stack, Typography, SectionCard } from '@sinnapi/ui';
import SavingsIcon from '@mui/icons-material/Savings';
import { formatMoney } from '@/lib/config';
import type { EarningsModel } from '@/data/overview';

type Props = {
  earnings: EarningsModel | undefined;
  loading: boolean;
};

/**
 * Where a vendor's money currently sits, as three plain figures.
 *
 * Deliberately not a part-to-whole chart: escrow custody and raised payouts
 * overlap — an approved payout is still counted in escrow until it settles — so
 * a stacked bar would imply a split that does not exist. Stated as separate
 * lines, each figure means exactly what it says.
 */
export default function EarningsBalanceCard({ earnings, loading }: Props) {
  const rows = [
    {
      label: 'Held in escrow',
      hint: earnings ? `${earnings.escrowCount.toLocaleString()} funded bookings` : '',
      value: earnings?.inEscrow ?? 0,
    },
    {
      label: 'Payouts in flight',
      hint: 'Raised, awaiting settlement',
      value: earnings?.pendingPayout ?? 0,
    },
    {
      label: 'Paid out all time',
      hint: 'Every settled payout',
      value: earnings?.lifetimeReleased ?? 0,
    },
  ];

  return (
    <SectionCard
      title="Where your money is"
      subtitle="Live balances, not a period total"
      icon={<SavingsIcon />}
      accent="success"
      sx={{ height: '100%' }}
      action={
        <Button component={RouterLink} to="/escrow" size="small" sx={{ textTransform: 'none' }}>
          Escrow
        </Button>
      }
    >
      <Stack divider={<Divider flexItem />} spacing={0}>
        {rows.map((row) => (
          <Box
            key={row.label}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1.5,
              gap: 2,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {row.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {row.hint}
              </Typography>
            </Box>
            {loading ? (
              <Skeleton variant="text" width={90} />
            ) : (
              <Typography variant="body1" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                {formatMoney(row.value)}
              </Typography>
            )}
          </Box>
        ))}
      </Stack>
    </SectionCard>
  );
}
