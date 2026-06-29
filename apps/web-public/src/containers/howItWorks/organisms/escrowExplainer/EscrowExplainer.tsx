import { Box, Chip, Container, Grid, Paper, Stack, Typography } from '@sinnapi/ui';
import { CheckCircle } from '@sinnapi/ui/icons';
import { palette, withAlpha } from '@sinnapi/ui/tokens';
import { mutedSurface } from '@/lib/sx';
import SectionHeading from '@/components/molecules/sectionHeading';
import ScrollReveal from '@/components/atoms/scrollReveal';
import { PAY_OPTIONS, ESCROW_FLOW } from './data/escrow';

/**
 * Payments explainer — sets out the two ways clients can pay (direct vs escrow)
 * and demystifies the escrow lifecycle in three plain steps. Sits on the muted
 * surface to break the page rhythm; cards reveal on scroll. Content lives in
 * `data/escrow`.
 */
export default function EscrowExplainer() {
  return (
    <Box sx={{ ...mutedSurface, borderTop: 1, borderColor: 'divider' }}>
      <Container sx={{ py: { xs: 6, md: 9 } }}>
        <SectionHeading
          align="center"
          overline="Payments"
          title="Two ways to pay — both built for trust"
          subtitle="Choose what feels right for every booking. When you want extra peace of mind, Sinnapi Escrow protects your money until the job is done."
        />

        <Grid container spacing={3}>
          {PAY_OPTIONS.map(({ Icon, title, body, points, recommended }, i) => (
            <Grid item xs={12} md={6} key={title}>
              <ScrollReveal delay={i * 90} sx={{ height: '100%' }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: { xs: 3, md: 4 },
                    height: '100%',
                    position: 'relative',
                    borderColor: recommended ? 'primary.main' : 'divider',
                    bgcolor: recommended
                      ? withAlpha(palette.light.primary.main, 0.04)
                      : 'background.paper',
                  }}
                >
                  {recommended && (
                    <Chip
                      label="Recommended"
                      color="primary"
                      size="small"
                      sx={{ position: 'absolute', top: 16, right: 16, fontWeight: 600 }}
                    />
                  )}
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'primary.main',
                      bgcolor: withAlpha(palette.light.primary.main, 0.1),
                    }}
                  >
                    <Icon />
                  </Box>
                  <Typography variant="h6" sx={{ mt: 2 }}>
                    {title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {body}
                  </Typography>
                  <Stack spacing={1.25} sx={{ mt: 2.5 }}>
                    {points.map((point) => (
                      <Stack key={point} direction="row" spacing={1.25} alignItems="flex-start">
                        <CheckCircle color="primary" fontSize="small" sx={{ mt: '2px' }} />
                        <Typography variant="body2" color="text.secondary">
                          {point}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              </ScrollReveal>
            </Grid>
          ))}
        </Grid>

        <Typography
          variant="overline"
          color="primary"
          sx={{ display: 'block', textAlign: 'center', mt: { xs: 6, md: 8 } }}
        >
          How Sinnapi Escrow works
        </Typography>
        <Grid container spacing={3} sx={{ mt: 0 }}>
          {ESCROW_FLOW.map(({ Icon, title, body }, i) => (
            <Grid item xs={12} sm={4} key={title}>
              <ScrollReveal delay={i * 90} sx={{ height: '100%' }}>
                <Stack spacing={1.5} alignItems="center" sx={{ textAlign: 'center', px: 1 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'common.white',
                      background: `linear-gradient(135deg, ${palette.light.primary.main}, ${palette.light.primary.dark})`,
                      boxShadow: 2,
                    }}
                  >
                    <Icon />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {String(i + 1).padStart(2, '0')} · {title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {body}
                  </Typography>
                </Stack>
              </ScrollReveal>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
