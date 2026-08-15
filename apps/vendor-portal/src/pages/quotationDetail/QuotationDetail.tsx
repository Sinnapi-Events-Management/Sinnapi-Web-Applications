import { Box, Grid, Stack, QueryState } from '@sinnapi/ui';
import { BackButton, EmptyState } from '@sinnapi/ui/router';
import QuotationHero from './components/organisms/QuotationHero';
import QuotationRequestCard from './components/organisms/QuotationRequestCard';
import QuotationQuoteCard from './components/organisms/QuotationQuoteCard';
import QuotationFactsCard from './components/organisms/QuotationFactsCard';
import QuotationTimelineCard from './components/organisms/QuotationTimelineCard';
import QuotationActionsCard from './components/organisms/QuotationActionsCard';
import { useQuotationDetail } from './hooks/useQuotationDetail';

/**
 * A single quotation as the vendor sees it: who asked, what they asked for,
 * what was quoted back, and what can still be done about it.
 *
 * The wide column is the work — the brief, then the quote, then the record. The
 * narrow one is the state: what can be done to it and how it got here. That is
 * the same split the client's page uses, which is deliberate; the two sides are
 * looking at one object and should recognise each other's screen.
 *
 * Layout only — `useQuotationDetail` owns the reads and each section owns its
 * own content.
 */
export default function QuotationDetail() {
  const {
    quotationId,
    quotation,
    client,
    event,
    items,
    isPriced,
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
          <QuotationHero quotation={quotation} client={client} event={event} isPriced={isPriced} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Stack spacing={3}>
                {quotation.request_details && (
                  <QuotationRequestCard requestDetails={quotation.request_details} />
                )}
                <QuotationQuoteCard
                  quotation={quotation}
                  items={items}
                  isEditable={isEditable}
                  isPriced={isPriced}
                />
                <QuotationFactsCard quotation={quotation} client={client} event={event} />
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Stack spacing={3}>
                <QuotationActionsCard quotation={quotation} isLapsed={isLapsed} />
                <QuotationTimelineCard quotationId={quotationId} status={quotation.status} />
              </Stack>
            </Grid>
          </Grid>
        </>
      )}
    </QueryState>
  );
}
