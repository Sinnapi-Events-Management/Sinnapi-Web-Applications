import { Box, Container, Chip, Typography, Stack } from '@sinnapi/ui/atoms';
import {
  Storefront,
  DescriptionOutlined,
  ScheduleOutlined,
  VerifiedOutlined,
} from '@mui/icons-material';
import { palette, withAlpha } from '@sinnapi/ui/tokens';

const REASSURANCES = [
  { Icon: ScheduleOutlined, text: 'Takes about 2 minutes' },
  { Icon: DescriptionOutlined, text: 'No documents needed to apply' },
  { Icon: VerifiedOutlined, text: 'Reviewed within 2–3 days' },
];

const gradient = (hex: string, opacity: number) =>
  `linear-gradient(180deg, ${withAlpha(hex, opacity)} 0%, transparent 100%)`;

/**
 * Compact page header for the vendor application — orients, reassures, no CTA.
 *
 * Tints are plain strings with a `data-mui-color-scheme` override rather than
 * `theme => …` callbacks: this is a server component, and a function `sx` can't
 * cross the RSC boundary into the client `Box`. Same approach as `lib/sx.ts`.
 */
export default function RegistrationHero() {
  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        pt: { xs: 5, md: 7 },
        pb: { xs: 3, md: 4 },
        background: gradient(palette.light.primary.light, 0.14),
        '[data-mui-color-scheme="dark"] &': {
          background: gradient(palette.dark.primary.main, 0.12),
        },
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
            '[data-mui-color-scheme="dark"] &': {
              bgcolor: withAlpha(palette.dark.primary.main, 0.18),
            },
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
          Tell us who you are and what you offer, and we’ll be in touch to get you listed. Apply as
          an individual or a registered business — no account needed to start.
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
