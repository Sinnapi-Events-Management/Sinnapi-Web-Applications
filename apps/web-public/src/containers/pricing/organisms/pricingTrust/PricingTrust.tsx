import { Box, Container, Grid, Typography } from '@sinnapi/ui';
import { palette, withAlpha } from '@sinnapi/ui/tokens';
import SectionHeading from '@/components/molecules/sectionHeading';
import { TRUST_SIGNALS } from './data/trustSignals';

/**
 * Trust band — the reassurances that de-risk subscribing, laid out as an even
 * icon grid. Mirrors WhyChoose's icon-chip treatment for brand continuity and
 * sits between the comparison table and the FAQs to soften the buying decision.
 */
export default function PricingTrust() {
  return (
    <Container sx={{ py: { xs: 6, md: 9 } }}>
      <SectionHeading
        align="center"
        overline="Why vendors trust us"
        title="A platform built to protect your business"
        subtitle="Pricing is only part of the story — here is what every plan stands on."
      />
      <Grid container spacing={3}>
        {TRUST_SIGNALS.map(({ Icon, title, body }) => (
          <Grid item xs={12} sm={6} md={3} key={title}>
            <Box
              sx={{
                height: '100%',
                textAlign: 'center',
                px: 2,
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  mx: 'auto',
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
            </Box>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
