import { Box, Container, Grid, Paper, Stack, Typography } from '@sinnapi/ui/atoms';
import { palette, withAlpha } from '@sinnapi/ui/tokens';
import SectionHeading from '@/components/molecules/sectionHeading';
import { REASONS } from './data/reasons';

/**
 * Why choose Sinnapi — the reasons clients and vendors trust the platform,
 * laid out as an even card grid. Numbered to read as a confident, scannable list.
 */
export default function WhyChoose() {
  return (
    <Container sx={{ py: { xs: 6, md: 9 } }}>
      <SectionHeading
        align="center"
        overline="Why choose Sinnapi"
        title="Built around trust, visibility & convenience"
        subtitle="Every part of Sinnapi is designed to protect your time, your money, and your peace of mind."
      />
      <Grid container spacing={3}>
        {REASONS.map(({ Icon, title, body }, i) => (
          <Grid item xs={12} sm={6} md={4} key={title}>
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                height: '100%',
                transition: 'box-shadow .2s, transform .2s, border-color .2s',
                '&:hover': {
                  boxShadow: 4,
                  transform: 'translateY(-4px)',
                  borderColor: 'primary.main',
                },
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    flexShrink: 0,
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
                <Typography
                  variant="overline"
                  color="text.disabled"
                  sx={{ fontWeight: 700, fontSize: '0.95rem' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </Typography>
              </Stack>
              <Typography variant="h6" sx={{ mt: 2 }}>
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {body}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
