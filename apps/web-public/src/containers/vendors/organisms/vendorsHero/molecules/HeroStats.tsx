import { Stack, Box, Typography, Divider } from '@sinnapi/ui/atoms';
import { common, withAlpha } from '@sinnapi/ui/tokens';
import { HERO_STATS } from '../data/heroStats';

/**
 * Trust strip beneath the hero search — a compact row of marketplace figures
 * (vendors / categories / rating) separated by hairlines. Purely presentational
 * over the teal hero; reads the static figures from `data/heroStats`.
 */
export default function HeroStats() {
  return (
    <Stack
      direction="row"
      spacing={{ xs: 2, sm: 4 }}
      justifyContent={{ xs: 'flex-start', md: 'center' }}
      alignItems="center"
      divider={
        <Divider
          orientation="vertical"
          flexItem
          sx={{ borderColor: withAlpha(common.white, 0.24) }}
        />
      }
      sx={{ mt: { xs: 4, md: 5 } }}
    >
      {HERO_STATS.map((stat) => (
        <Box key={stat.label} sx={{ textAlign: { xs: 'left', md: 'center' } }}>
          <Typography variant="h5" sx={{ color: 'common.white', fontWeight: 700, lineHeight: 1.1 }}>
            {stat.value}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: withAlpha(common.white, 0.78), letterSpacing: 0.3 }}
          >
            {stat.label}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
