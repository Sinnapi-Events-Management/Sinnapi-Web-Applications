import { Box, Grid, Stack, QueryState } from '@sinnapi/ui';
import { BackButton, EmptyState } from '@sinnapi/ui/router';
import QuotationHero from './components/organisms/QuotationHero';
import QuotationItemsCard from './components/organisms/QuotationItemsCard';
import QuotationFactsCard from './components/organisms/QuotationFactsCard';
import QuotationTimelineCard from './components/organisms/QuotationTimelineCard';
import QuotationActionsCard from './components/organisms/QuotationActionsCard';
import QuotationAdvanceTermsCard from './components/organisms/QuotationAdvanceTermsCard';
import QuotationNextStepsCard from './components/organisms/QuotationNextStepsCard';
import { useQuotationDetail } from './hooks/useQuotationDetail';

/**
 * A single quotation as the client sees it: who it is from, what it covers,
 * what it costs, how it is to be paid, and what they can do about it.
 *
 * The two columns are ordered by the question each answers. The wide one is
 * "what am I being offered" — the breakdown first, because that is what the
 * client came to read, then the record and the trail. The narrow one is "what
 * do I do about it": the response, the terms that response commits them to, and
 * the ways out that do not change anything.
 *
 * Layout only — `useQuotationDetail` owns the reads and each section owns its
 * own content.
 */
export default function QuotationDetail() {
  const { quotationId, quotation, vendor, event, items, isPriced, isLoading, error } =
    useQuotationDetail();

  return (
    <QueryState isLoading={isLoading} error={error}>
      <Box sx={{ mb: 2 }}>
        <BackButton fallback="/quotations" />
      </Box>

      {!quotation ? (
        <EmptyState
          title="Quotation not found"
          description="This quote may have been removed."
          ctaLabel="Back to quotations"
          ctaHref="/quotations"
        />
      ) : (
        <>
          <QuotationHero quotation={quotation} vendor={vendor} event={event} isPriced={isPriced} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Stack spacing={3}>
                <QuotationItemsCard quotation={quotation} items={items} isPriced={isPriced} />
                <QuotationFactsCard quotation={quotation} event={event} />
                <QuotationTimelineCard quotationId={quotationId} status={quotation.status} />
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Stack spacing={3}>
                <QuotationActionsCard quotation={quotation} />
                {/* Terms only exist once the vendor has actually sent a price. */}
                {quotation.advance_rate != null && (
                  <QuotationAdvanceTermsCard quotation={quotation} />
                )}
                <QuotationNextStepsCard vendorId={quotation.vendor_id} vendor={vendor} />
              </Stack>
            </Grid>
          </Grid>
        </>
      )}
    </QueryState>
  );
}
