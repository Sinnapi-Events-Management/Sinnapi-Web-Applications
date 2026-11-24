import { Box, DetailTabPanel, QueryState } from '@sinnapi/ui';
import { BackButton, EmptyState } from '@sinnapi/ui/router';
import { FEATURES } from '@sinnapi/utils/constants';
import QuotationHero from './components/organisms/QuotationHero';
import QuotationNextStepCard from './components/organisms/QuotationNextStepCard';
import QuotationTabs from './components/molecules/QuotationTabs';
import OverviewSection from './components/organisms/OverviewSection';
import QuoteSection from './components/organisms/QuoteSection';
import MessagesSection from './components/organisms/MessagesSection';
import ProgressSection from './components/organisms/ProgressSection';
import { useQuotationDetailPage } from './hooks/useQuotationDetailPage';

/**
 * One quotation as the vendor sees it, redesigned phone-first on 2026-11-17:
 *
 * 1. **Header** — who, what they asked for, when, where, the price, Call.
 * 2. **What to do now** — Request → Price sent → Accepted → Booked, one
 *    sentence and one main button (usually the 3-step builder).
 * 3. **Details · Quote · Messages · History** — the record.
 *
 * Layout only — `useQuotationDetailPage` owns the reads and the open tab.
 */
export default function QuotationDetail() {
  const {
    quotationId,
    quotation,
    client,
    isClientLoading,
    event,
    items,
    pricing,
    advance,
    tab,
    setTab,
    feedback,
    conversation,
    messageClient,
    pdf,
    isLoading,
    error,
  } = useQuotationDetailPage();

  const openQuote = () => {
    setTab('quote');
    requestAnimationFrame(() =>
      document
        .getElementById('quote-tabs-anchor')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };

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
        // Room at the bottom on phones for the sticky action button.
        <Box sx={{ pb: { xs: 10, md: 0 } }}>
          <Box sx={{ mb: 2 }}>
            <QuotationHero
              quotation={quotation}
              client={client}
              event={event}
              pricing={pricing}
              pdf={pdf}
            />
          </Box>

          <QuotationNextStepCard
            quotation={quotation}
            items={items}
            client={client}
            feedback={feedback?.isOutstanding || quotation.status !== 'revised' ? feedback : null}
            onOpenQuote={openQuote}
            onMessageClient={() => void messageClient()}
            isMessaging={conversation.isStarting}
          />

          <Box id="quote-tabs-anchor" sx={{ scrollMarginTop: 72 }} />
          <QuotationTabs value={tab} onChange={setTab} unreadCount={conversation.unreadCount} />

          <DetailTabPanel value="overview" active={tab} idPrefix="quotation">
            <OverviewSection
              quotation={quotation}
              client={client}
              isClientLoading={isClientLoading}
              event={event}
            />
          </DetailTabPanel>
          <DetailTabPanel value="quote" active={tab} idPrefix="quotation">
            <QuoteSection quotation={quotation} items={items} pricing={pricing} advance={advance} />
          </DetailTabPanel>
          {FEATURES.clientVendorMessaging && (
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
          )}
          <DetailTabPanel value="progress" active={tab} idPrefix="quotation">
            <ProgressSection quotationId={quotationId} quotation={quotation} />
          </DetailTabPanel>
        </Box>
      )}
    </QueryState>
  );
}
