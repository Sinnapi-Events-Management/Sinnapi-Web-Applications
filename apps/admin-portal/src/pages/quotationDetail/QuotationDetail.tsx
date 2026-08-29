import { DetailTabPanel, QueryState } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import QuotationHero from './components/organisms/QuotationHero';
import QuotationTabs from './components/molecules/QuotationTabs';
import OverviewSection from './components/organisms/OverviewSection';
import QuoteSection from './components/organisms/QuoteSection';
import PaymentSection from './components/organisms/PaymentSection';
import ProgressSection from './components/organisms/ProgressSection';
import { useQuotationDetailPage } from './hooks/useQuotationDetailPage';

/**
 * One quotation as the console sees it: what was asked for, what was quoted
 * back, what it would have paid and how it ended.
 *
 * The page the quotations list never had. Until now `/quotations` was a table
 * whose rows went nowhere, so an operator asked about a specific quote had a
 * reference, a status and a total and no way to see what was behind them — the
 * line items were not readable by any admin permission at all. See
 * `get_quotation_admin` for how that is fixed and why with a function rather
 * than a policy.
 *
 * Read-only, and there is no action bar above the tabs for that reason. Both
 * the other portals' quotation pages pin one there because accepting or
 * withdrawing is the reason those users opened the page; the console has no
 * such control and should not grow a hollow bar to match. `quotations_update`
 * admits only the client and the vendor owner — a quote is an offer between two
 * parties, and this side reads it.
 *
 * Layout only. `useQuotationDetailPage` owns the read, every derived figure and
 * the open section; each section owns its own contents.
 */
export default function QuotationDetail() {
  const {
    quotationId,
    quotation,
    items,
    pricing,
    advance,
    isLapsed,
    tab,
    setTab,
    isLoading,
    error,
  } = useQuotationDetailPage();

  return (
    <QueryState isLoading={isLoading} error={error}>
      {!quotation ? (
        <EmptyState
          title="Quotation not found"
          description="This quotation may have been removed."
          ctaLabel="Back to quotations"
          ctaHref="/quotations"
        />
      ) : (
        <>
          <QuotationHero quotation={quotation} pricing={pricing} isLapsed={isLapsed} />

          <QuotationTabs value={tab} onChange={setTab} />

          <DetailTabPanel value="overview" active={tab} idPrefix="quotation">
            <OverviewSection quotation={quotation} />
          </DetailTabPanel>
          <DetailTabPanel value="quote" active={tab} idPrefix="quotation">
            <QuoteSection items={items} pricing={pricing} />
          </DetailTabPanel>
          <DetailTabPanel value="payment" active={tab} idPrefix="quotation">
            <PaymentSection
              pricing={pricing}
              advance={advance}
              daysBefore={quotation.advance_release_days_before}
              note={quotation.advance_terms_note}
            />
          </DetailTabPanel>
          <DetailTabPanel value="progress" active={tab} idPrefix="quotation">
            <ProgressSection quotationId={quotationId} status={quotation.status} />
          </DetailTabPanel>
        </>
      )}
    </QueryState>
  );
}
