import { Box, Container, Grid, Paper, Typography } from '@sinnapi/ui/atoms';
import { palette, withAlpha } from '@sinnapi/ui/tokens';
import SectionHeading from '@/components/molecules/sectionHeading';
import { scrollAnchor } from '@/lib/sx';
import { PILLARS } from './data/pillars';

/**
 * Mission & Vision — two paired highlight cards stating what Sinnapi is
 * driving toward, presented right after the hero for instant clarity of purpose.
 */
export default function MissionVision() {
  return (
    <Container sx={{ py: { xs: 6, md: 9 } }}>
      <SectionHeading
        align="center"
        overline="What drives us"
        title="Our mission & vision"
        subtitle="Why we exist, and the future we are building toward for clients and vendors alike."
      />
      <Grid container spacing={3}>
        {PILLARS.map(({ anchor, Icon, overline, title, body }) => (
          <Grid item xs={12} md={6} key={overline} id={anchor} sx={scrollAnchor}>
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 3, md: 4 },
                height: '100%',
                transition: 'box-shadow .2s, transform .2s, border-color .2s',
                '&:hover': {
                  boxShadow: 4,
                  transform: 'translateY(-4px)',
                  borderColor: 'primary.main',
                },
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'primary.main',
                  bgcolor: withAlpha(palette.light.primary.main, 0.1),
                }}
              >
                <Icon fontSize="medium" />
              </Box>
              <Typography variant="overline" color="primary" sx={{ display: 'block', mt: 2 }}>
                {overline}
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.5 }}>
                {title}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5 }}>
                {body}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
