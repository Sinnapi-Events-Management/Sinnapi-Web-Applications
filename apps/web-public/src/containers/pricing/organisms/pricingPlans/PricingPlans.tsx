'use client';
import { Box, Container, Typography } from '@sinnapi/ui/atoms';
import { scrollAnchor } from '@/lib/sx';
import SectionHeading from '@/components/molecules/sectionHeading';
import { usePricingPlans } from './hooks/usePricingPlans';
import BillingToggle from './molecules/BillingToggle';
import PlansResults from './molecules/PlansResults';
import GuaranteeNote from './molecules/GuaranteeNote';

/**
 * Plans section — the heart of the pricing page. Lays out the heading, the
 * billing toggle and the cards; every decision behind them (what the catalogue
 * is, which cycle can be shown, what the annual saving actually works out to)
 * belongs to `usePricingPlans`.
 *
 * Client component because of the billing toggle, but not for the data: the
 * catalogue is prefetched on the server and hydrated, so the prices are in the
 * HTML on first paint and flipping the toggle costs no request.
 *
 * The toggle and the reassurance row only appear alongside real cards — offering
 * a billing choice above an error message, or promising a free trial on a
 * catalogue that failed to load, is UI describing data that isn't there.
 *
 * Anchored as `#plans` so the hero's "Compare plans" CTA scrolls here.
 */
export default function PricingPlans() {
  const {
    plans,
    effectiveCycle,
    setCycle,
    canBillAnnually,
    savingPercent,
    trialDays,
    isLoading,
    isError,
    refetch,
  } = usePricingPlans();

  const hasPlans = plans.length > 0;

  return (
    <Box id="plans" sx={scrollAnchor}>
      <Container sx={{ py: { xs: 6, md: 9 } }}>
        <SectionHeading
          align="center"
          overline="Plans & pricing"
          title="Choose the plan that fits your business"
          subtitle="Every plan includes a verified badge, direct messaging and the quote system. Pay monthly, or save by paying yearly."
        />

        {hasPlans && canBillAnnually && (
          <Box sx={{ mb: { xs: 4, md: 5 } }}>
            <BillingToggle
              value={effectiveCycle}
              onChange={setCycle}
              savingPercent={savingPercent}
            />
          </Box>
        )}

        <PlansResults
          plans={plans}
          cycle={effectiveCycle}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
        />

        {hasPlans && (
          <>
            <GuaranteeNote trialDays={trialDays} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
              Prices are shown per month and exclude any applicable taxes; yearly plans are billed
              once for the full term. Inactive subscriptions hide your public listing until renewed.
            </Typography>
          </>
        )}
      </Container>
    </Box>
  );
}
