import { Box, Grid, QueryState } from '@sinnapi/ui';
import { BackButton, EmptyState } from '@sinnapi/ui/router';
import QuotationHero from './components/organisms/QuotationHero';
import QuotationOfferColumn from './components/organisms/QuotationOfferColumn';
import QuotationResponseColumn from './components/organisms/QuotationResponseColumn';
import { useQuotationDetail } from './hooks/useQuotationDetail';

/**
 * A single quotation as the client sees it: who it is from, what it covers,
 * what it costs, how it is to be paid, and what they can do about it.
 *
 * The two columns are ordered by the question each answers — "what am I being
 * offered" and "what do I do about it" — and each owns its own contents. This
 * file is the composition and nothing else: it holds no condition about when a
 * card appears and does no arithmetic on the price.
 *
 * `useQuotationDetail` owns the reads and every derived figure, including the
 * total. That matters more here than it looks: a page whose cards each read
 * `quotation.total` for themselves is a page where they can each be wrong
 * separately, and the way that showed up was all of them agreeing on zero.
 */
export default function QuotationDetail() {
  const { quotationId, quotation, vendor, event, items, pricing, advance, isLoading, error } =
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
          <QuotationHero quotation={quotation} vendor={vendor} event={event} pricing={pricing} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <QuotationOfferColumn
                quotationId={quotationId}
                quotation={quotation}
                event={event}
                items={items}
                pricing={pricing}
              />
            </Grid>
            <Grid item xs={12} md={5}>
              <QuotationResponseColumn
                quotation={quotation}
                vendor={vendor}
                event={event}
                pricing={pricing}
                advance={advance}
              />
            </Grid>
          </Grid>
        </>
      )}
    </QueryState>
  );
}
