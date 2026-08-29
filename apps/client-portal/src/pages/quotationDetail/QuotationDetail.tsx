import { Box, DetailTabPanel, QueryState } from '@sinnapi/ui';
import { BackButton, EmptyState } from '@sinnapi/ui/router';
import QuotationHero from './components/organisms/QuotationHero';
import QuotationFeedbackBanner from './components/organisms/QuotationFeedbackBanner';
import QuotationActionBar from './components/organisms/QuotationActionBar';
import QuotationTabs from './components/molecules/QuotationTabs';
import OverviewSection from './components/organisms/OverviewSection';
import QuoteSection from './components/organisms/QuoteSection';
import PaymentSection from './components/organisms/PaymentSection';
import MessagesSection from './components/organisms/MessagesSection';
import ProgressSection from './components/organisms/ProgressSection';
import { useQuotationDetailPage } from './hooks/useQuotationDetailPage';

/**
 * A single quotation as the client sees it: who it is from, what it covers,
 * what it costs, how it is to be paid, what has been said about it, and what
 * they can do about it.
 *
 * Three things stay above the tabs and never move: the hero, which says which
 * quote this is; the last note on it, when there is one; and the response bar,
 * which is the only part of the page that *does* anything. Everything below
 * them is a record, split into five sections that each fit a screen.
 *
 * THE FEEDBACK BANNER IS ABOVE THE TABS FOR A REASON. Notes on a quotation live
 * in `quotation_status_history.reason`, rendered only by the status trail, in
 * the last tab. A client whose quote has read `revised` for three days had no
 * way to see what they themselves had asked for without going and finding it.
 * It now sits between the hero and the actions, which is both where the
 * question is asked and the order it should be answered in.
 *
 * This file is the composition and nothing else: it holds no condition about
 * when a card appears and does no arithmetic on the price.
 * `useQuotationDetailPage` owns the reads, every derived figure — including the
 * total — the open section, the note and the conversation. That matters more
 * than it looks: a page whose cards each read `quotation.total` for themselves
 * is a page where they can each be wrong separately, and the way that showed up
 * was all of them agreeing on zero.
 */
export default function QuotationDetail() {
  const {
    quotationId,
    quotation,
    vendor,
    event,
    items,
    pricing,
    advance,
    tab,
    setTab,
    feedback,
    conversation,
    messageVendor,
    isLoading,
    error,
  } = useQuotationDetailPage();

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

          <QuotationFeedbackBanner
            feedback={feedback}
            onMessageVendor={() => void messageVendor()}
            isStarting={conversation.isStarting}
          />

          <QuotationActionBar quotation={quotation} />

          <QuotationTabs value={tab} onChange={setTab} unreadCount={conversation.unreadCount} />

          <DetailTabPanel value="overview" active={tab} idPrefix="quotation">
            <OverviewSection
              quotation={quotation}
              vendor={vendor}
              event={event}
              onMessageVendor={() => void messageVendor()}
              isMessaging={conversation.isStarting}
            />
          </DetailTabPanel>
          <DetailTabPanel value="quote" active={tab} idPrefix="quotation">
            <QuoteSection items={items} pricing={pricing} />
          </DetailTabPanel>
          <DetailTabPanel value="payment" active={tab} idPrefix="quotation">
            <PaymentSection
              pricing={pricing}
              advance={advance}
              daysBefore={quotation.advance_release_days_before}
            />
          </DetailTabPanel>
          <DetailTabPanel value="messages" active={tab} idPrefix="quotation">
            <MessagesSection
              conversation={conversation.conversation}
              vendorName={vendor?.business_name ?? 'the vendor'}
              vendorId={quotation.vendor_id}
              isLoading={conversation.isLoading}
              isStarting={conversation.isStarting}
              error={conversation.error}
              onClearError={conversation.clearError}
              onStart={() => void messageVendor()}
            />
          </DetailTabPanel>
          <DetailTabPanel value="progress" active={tab} idPrefix="quotation">
            <ProgressSection
              quotationId={quotationId}
              quotation={quotation}
              vendor={vendor}
              event={event}
              pricing={pricing}
            />
          </DetailTabPanel>
        </>
      )}
    </QueryState>
  );
}
