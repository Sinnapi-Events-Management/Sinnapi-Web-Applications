import { Box, Container, Chip, Typography, Stack } from '@sinnapi/ui';
import { Storefront, LockOutlined, ScheduleOutlined, VerifiedOutlined } from '@sinnapi/ui/icons';
import { palette, withAlpha } from '@sinnapi/ui/tokens';

const REASSURANCES = [
  { Icon: ScheduleOutlined, text: 'Takes about 10 minutes' },
  { Icon: LockOutlined, text: 'Your documents stay private' },
  { Icon: VerifiedOutlined, text: 'Reviewed within 2–3 days' },
];

/** Compact page header for the vendor application — orients, reassures, no CTA. */
export default function RegistrationHero() {
  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        pt: { xs: 5, md: 7 },
        pb: { xs: 3, md: 4 },
        background: `linear-gradient(180deg, ${withAlpha(palette.light.primary.light, 0.14)} 0%, transparent 100%)`,
      }}
    >
      <Container>
        <Chip
          icon={<Storefront sx={{ color: 'inherit !important' }} fontSize="small" />}
          label="Become a Sinnapi vendor"
          size="small"
          sx={{
            mb: 2,
            fontWeight: 600,
            color: 'primary.main',
            bgcolor: withAlpha(palette.light.primary.main, 0.1),
            '& .MuiChip-icon': { color: 'primary.main' },
          }}
        />
        <Typography variant="h1" sx={{ fontSize: { xs: '2rem', md: '2.6rem' } }}>
          Vendor application
        </Typography>
        <Typography
          variant="h6"
          sx={{ mt: 1.5, fontWeight: 400, color: 'text.secondary', maxWidth: 620 }}
        >
          Tell us about your business and we’ll get you listed. You can apply as an individual or a
          registered business — no account needed to start.
        </Typography>

        <Stack
          direction="row"
          flexWrap="wrap"
          useFlexGap
          spacing={{ xs: 1.5, sm: 3 }}
          sx={{ mt: 3 }}
        >
          {REASSURANCES.map(({ Icon, text }) => (
            <Stack key={text} direction="row" spacing={0.75} alignItems="center">
              <Icon sx={{ color: 'primary.main' }} fontSize="small" />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                {text}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}
