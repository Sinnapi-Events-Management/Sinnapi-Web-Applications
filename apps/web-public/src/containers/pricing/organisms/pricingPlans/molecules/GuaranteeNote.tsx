import { Box, Stack, Typography } from '@sinnapi/ui';
import { EventAvailable, Cancel, MoneyOff } from '@sinnapi/ui/icons';

// Low-commitment reassurances shown directly under the plan cards — the small
// print buyers scan before they click. Icon-led so it reads at a glance.
const GUARANTEES: { Icon: typeof EventAvailable; label: string }[] = [
  { Icon: EventAvailable, label: '30-day free trial after approval' },
  { Icon: Cancel, label: 'Cancel anytime' },
  { Icon: MoneyOff, label: 'No setup fees' },
];

/**
 * The trial / cancel / no-fee reassurance row beneath the plan grid.
 */
export default function GuaranteeNote() {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 1.5, sm: 4 }}
      justifyContent="center"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      sx={{ mt: 4 }}
    >
      {GUARANTEES.map(({ Icon, label }) => (
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
