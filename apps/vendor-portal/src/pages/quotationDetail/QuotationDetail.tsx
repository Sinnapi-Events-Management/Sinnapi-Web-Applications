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
 * A single quotation as the vendor sees it: who asked, what they asked for,
 * what was quoted back, what the client said about it, what it pays and what
 * can still be done about it.
 *
 * Three things stay above the tabs and never move: the hero, which says which
 * quote this is; the client's last word on it, when they left one; and the
 * action bar, which is the only part of the page that *does* anything.
 * Everything below them is a record, split into five sections that each fit a
 * screen.
 *
 * THE FEEDBACK BANNER IS ABOVE THE TABS FOR A REASON. The client's note lives
 * in `quotation_status_history.reason`, rendered only by the status trail, in
 * the last tab — so a vendor opening a quote marked `revised` saw the word and
 * none of the sentence. It now sits between the hero and the actions, which is
 * both where the question is asked and the order it should be answered in: the
 * request first, then the controls that respond to it.
 *
 * This file is the composition and nothing else — no condition about when a
 * card appears, no arithmetic on the price. `useQuotationDetailPage` owns the
 * reads, every derived figure, the open section, the client's note and the
 * conversation; each section owns its own contents.
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
    tab,
    setTab,
    feedback,
    conversation,
    messageClient,
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
          description="This quote request may have been removed."
          ctaLabel="Back to quotations"
          ctaHref="/quotations"
        />
      ) : (
        <>
          <QuotationHero quotation={quotation} client={client} event={event} pricing={pricing} />

          <QuotationFeedbackBanner
            feedback={feedback}
            onMessageClient={() => void messageClient()}
            onOpenQuote={() => setTab('quote')}
            isStarting={conversation.isStarting}
          />

          <QuotationActionBar
            quotation={quotation}
            isLapsed={isLapsed}
            onMessageClient={() => void messageClient()}
            isMessaging={conversation.isStarting}
          />

          <QuotationTabs value={tab} onChange={setTab} unreadCount={conversation.unreadCount} />

          <DetailTabPanel value="overview" active={tab} idPrefix="quotation">
            <OverviewSection quotation={quotation} client={client} event={event} />
          </DetailTabPanel>
          <DetailTabPanel value="quote" active={tab} idPrefix="quotation">
            <QuoteSection
              quotation={quotation}
              items={items}
              pricing={pricing}
              isEditable={isEditable}
            />
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
              clientName={client?.full_name ?? 'the client'}
              clientId={quotation.client_id}
              isLoading={conversation.isLoading}
              isStarting={conversation.isStarting}
              error={conversation.error}
              onClearError={conversation.clearError}
              onStart={() => void messageClient()}
            />
          </DetailTabPanel>
          <DetailTabPanel value="progress" active={tab} idPrefix="quotation">
            <ProgressSection quotationId={quotationId} quotation={quotation} />
          </DetailTabPanel>
        </>
      )}
    </QueryState>
  );
}
