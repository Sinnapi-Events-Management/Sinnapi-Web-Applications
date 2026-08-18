import { Box, Grid, QueryState } from '@sinnapi/ui';
import { BackButton, EmptyState } from '@sinnapi/ui/router';
import QuotationHero from './components/organisms/QuotationHero';
import QuotationWorkColumn from './components/organisms/QuotationWorkColumn';
import QuotationStateColumn from './components/organisms/QuotationStateColumn';
import { useQuotationDetail } from './hooks/useQuotationDetail';

/**
 * A single quotation as the vendor sees it: who asked, what they asked for,
 * what was quoted back, what it pays and what can still be done about it.
 *
 * The wide column is the work; the narrow one is the state. That is the same
 * split the client's page uses, which is deliberate; the two sides are looking
 * at one object and should recognise each other's screen.
 *
 * This file is the composition and nothing else — no condition about when a
 * card appears, no arithmetic on the price. `useQuotationDetail` owns the reads
 * and every derived figure, and each column owns its own contents.
 */
export default function QuotationDetail() {
  const {
    quotationId,
    quotation,
    client,
    event,
    items,
    pricing,
    advance,
    isEditable,
    isLapsed,
    isLoading,
    error,
  } = useQuotationDetail();

  return (
    <QueryState isLoading={isLoading} error={error}>
      <Box sx={{ mb: 2 }}>
        <BackButton fallback="/quotations" />
      </Box>

      {!quotation ? (
        <EmptyState
          title="Quotation not found"
          description="This quote request may have been removed."
          ctaLabel="Back to quotations"
          ctaHref="/quotations"
        />
      ) : (
        <>
          <QuotationHero quotation={quotation} client={client} event={event} pricing={pricing} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <QuotationWorkColumn
                quotation={quotation}
                client={client}
                event={event}
                items={items}
                pricing={pricing}
                isEditable={isEditable}
              />
            </Grid>
            <Grid item xs={12} md={5}>
              <QuotationStateColumn
                quotationId={quotationId}
                quotation={quotation}
                pricing={pricing}
                advance={advance}
                isLapsed={isLapsed}
              />
            </Grid>
          </Grid>
        </>
      )}
    </QueryState>
  );
}
