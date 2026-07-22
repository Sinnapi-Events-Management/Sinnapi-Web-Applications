import { Box, Stack, Typography } from '@sinnapi/ui/atoms';
import { EventAvailable, Cancel, MoneyOff } from '@mui/icons-material';

/**
 * The trial / cancel / no-fee reassurance row beneath the plan grid — the small
 * print buyers scan before they click. Icon-led so it reads at a glance.
 *
 * The trial length comes from the catalogue (`trial_days`) rather than the copy,
 * so shortening the trial in the admin portal can't leave the marketing page
 * promising the old one. When the tiers disagree the caller passes null and the
 * claim drops to something generic that all of them keep — see
 * `sharedTrialDays`.
 */
export default function GuaranteeNote({ trialDays }: { trialDays: number | null }) {
  const guarantees = [
    {
      Icon: EventAvailable,
      label: trialDays ? `${trialDays}-day free trial after approval` : 'Free trial after approval',
    },
    { Icon: Cancel, label: 'Cancel anytime' },
    { Icon: MoneyOff, label: 'No setup fees' },
  ];

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 1.5, sm: 4 }}
      justifyContent="center"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      sx={{ mt: 4 }}
    >
      {guarantees.map(({ Icon, label }) => (
        <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon fontSize="small" color="primary" aria-hidden />
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
