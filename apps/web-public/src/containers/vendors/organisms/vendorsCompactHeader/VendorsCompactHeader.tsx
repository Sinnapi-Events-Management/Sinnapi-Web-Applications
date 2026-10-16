import { Box, Container, Typography, Chip, Stack } from '@sinnapi/ui/atoms';
import { Verified } from '@mui/icons-material';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';

/**
 * Compact vendors header — replaces the large hero with a minimal brand strip.
 *
 * This header is significantly shorter than the original hero, allowing vendors
 * to be visible immediately upon landing on the page. It retains brand identity
 * through the teal gradient and "Verified marketplace" trust signal, but removes
 * the search form, quick filters, and stats which are now available in the
 * toolbar area below.
 *
 * Key differences from the original hero:
 * - Height reduced from ~600px to ~120px
 * - Search form moved to toolbar for better UX
 * - Quick filters removed (available in toolbar facets)
 * - Stats removed (can be added elsewhere if needed)
 * - Background image removed for cleaner, faster load
 */
export default function VendorsCompactHeader() {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        color: 'common.white',
        backgroundColor: 'primary.dark',
        pt: { xs: 4, md: 5 },
        pb: { xs: 3, md: 4 },
      }}
    >
      {/* Brand teal gradient background (no image for faster load) */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${withAlpha(gradientStops.tealDeep, 0.98)} 0%, ${withAlpha(palette.light.primary.dark, 0.95)} 100%)`,
        }}
      />

      <Container sx={{ position: 'relative', maxWidth: 'md' }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Chip
            icon={<Verified sx={{ color: 'inherit !important' }} fontSize="small" />}
            label="Verified marketplace"
            size="small"
            sx={{
              color: 'common.white',
              bgcolor: withAlpha(common.white, 0.14),
              fontWeight: 600,
              '& .MuiChip-icon': { color: palette.light.secondary.light },
            }}
          />
        </Stack>

        <Typography
          variant="h1"
          sx={{
            color: 'common.white',
            fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.6rem' },
            lineHeight: 1.15,
            fontWeight: 700,
          }}
        >
          Book the right vendor, every time.
        </Typography>
      </Container>
    </Box>
  );
}
