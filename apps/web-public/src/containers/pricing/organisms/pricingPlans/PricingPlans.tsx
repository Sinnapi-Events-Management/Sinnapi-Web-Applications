'use client';
import { useState } from 'react';
import { Box, Container, Grid, Typography } from '@sinnapi/ui/atoms';
import { scrollAnchor } from '@/lib/sx';
import SectionHeading from '@/components/molecules/sectionHeading';
import { PLANS, type BillingCycle } from './data/plans';
import BillingToggle from './molecules/BillingToggle';
import PlanCard from './molecules/PlanCard';
import GuaranteeNote from './molecules/GuaranteeNote';

/**
 * Plans section — the heart of the pricing page. Owns the billing-cycle state
 * (annual by default) and feeds it to the toggle and every PlanCard so prices
 * switch together. Client component because of that shared interactive state;
 * the presentational pieces are dumb molecules.
 *
 * Anchored as `#plans` so the hero's "Compare plans" CTA scrolls here.
 */
export default function PricingPlans() {
  const [cycle, setCycle] = useState<BillingCycle>('annual');

  return (
    <Box id="plans" sx={scrollAnchor}>
      <Container sx={{ py: { xs: 6, md: 9 } }}>
        <SectionHeading
          align="center"
          overline="Plans & pricing"
          title="Choose the plan that fits your business"
          subtitle="Every plan includes a verified badge, direct messaging and the quote system. Pay monthly, or save by paying yearly."
        />

        <Box sx={{ mb: { xs: 4, md: 5 } }}>
          <BillingToggle value={cycle} onChange={setCycle} />
        </Box>

        <Grid container spacing={3} alignItems="stretch">
          {PLANS.map((plan) => (
            <Grid item xs={12} md={4} key={plan.key}>
              <PlanCard plan={plan} cycle={cycle} />
            </Grid>
          ))}
        </Grid>

        <GuaranteeNote />

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
          Prices shown are indicative and confirmed during onboarding; they may vary by billing
          cycle. Inactive subscriptions hide your public listing until renewed.
        </Typography>
      </Container>
    </Box>
  );
}
