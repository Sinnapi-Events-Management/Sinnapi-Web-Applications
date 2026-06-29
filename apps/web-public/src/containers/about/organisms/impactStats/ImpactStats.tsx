import { Box, Container, Grid, Stack, Typography } from '@sinnapi/ui';
import { common, gradientStops, palette, withAlpha } from '@sinnapi/ui/tokens';
import { IMPACT_STATS } from './data/stats';

/**
 * Impact band — quantified proof on a brand-teal surface. Glass stat cards
 * echo the home hero's stat bar so credibility figures feel consistent.
 */
export default function ImpactStats() {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        color: 'common.white',
        py: { xs: 7, md: 10 },
        background: `linear-gradient(135deg, ${gradientStops.tealDeep} 0%, ${palette.light.primary.dark} 55%, ${palette.light.primary.main} 100%)`,
        '[data-mui-color-scheme="dark"] &': {
          background: `linear-gradient(135deg, ${gradientStops.neutralDeep} 0%, ${palette.light.primary.dark} 100%)`,
        },
      }}
    >
      <Container sx={{ position: 'relative' }}>
        <Box sx={{ textAlign: 'center', maxWidth: 720, mx: 'auto', mb: { xs: 5, md: 6 } }}>
          <Typography variant="overline" sx={{ color: 'secondary.light' }}>
            Our impact
          </Typography>
          <Typography variant="h2" sx={{ color: 'common.white', mt: 0.5 }}>
            Driving real business before we even launched
          </Typography>
          <Typography sx={{ mt: 1.5, color: withAlpha(common.white, 0.88) }}>
            Even before our official launch, we channelled meaningful business to the vendors on our
            waitlist through referrals.
          </Typography>
        </Box>

        <Grid container spacing={{ xs: 2, md: 3 }}>
          {IMPACT_STATS.map(({ Icon, value, label }) => (
            <Grid item xs={6} md={3} key={label}>
              <Box
                sx={{
                  height: '100%',
                  p: { xs: 2.5, md: 3 },
                  textAlign: 'center',
                  borderRadius: 3,
                  bgcolor: withAlpha(common.white, 0.1),
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  border: `1px solid ${withAlpha(common.white, 0.22)}`,
                  transition: 'transform .2s, background-color .2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    bgcolor: withAlpha(common.white, 0.16),
                  },
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                  <Icon
                    aria-hidden
                    sx={{ color: 'secondary.light', fontSize: { xs: '1.5rem', md: '1.9rem' } }}
                  />
                  <Typography
                    sx={{
                      fontWeight: 600,
                      lineHeight: 1.1,
                      fontSize: { xs: '1.4rem', md: '1.6rem' },
                    }}
                  >
                    {value}
                  </Typography>
                </Stack>
                <Typography
                  variant="caption"
                  sx={{
                    mt: 0.75,
                    display: 'block',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: withAlpha(common.white, 0.82),
                  }}
                >
                  {label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
