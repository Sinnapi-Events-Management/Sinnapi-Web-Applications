import { Box, DetailTabPanel, QueryState } from '@sinnapi/ui';
import { BackButton, EmptyState } from '@sinnapi/ui/router';
import QuotationHero from './components/organisms/QuotationHero';
import QuotationFeedbackBanner from './components/organisms/QuotationFeedbackBanner';
import QuotationActionBar from './components/organisms/QuotationActionBar';
import QuotationBookingBar from './components/organisms/QuotationBookingBar';
import QuotationTabs from './components/molecules/QuotationTabs';
import OverviewSection from './components/organisms/OverviewSection';
import QuoteSection from './components/organisms/QuoteSection';
import PaymentSection from './components/organisms/PaymentSection';
import MessagesSection from './components/organisms/MessagesSection';
import ProgressSection from './components/organisms/ProgressSection';
import CreateBookingDialog from './components/organisms/CreateBookingDialog';
import { useQuotationDetailPage } from './hooks/useQuotationDetailPage';

/**
 * A single quotation as the client sees it: who it is from, what it covers,
 * what it costs, how it is to be paid, what has been said about it, and what
 * they can do about it.
 *
 * Four things stay above the tabs and never move: the hero, which says which
 * quote this is; the last note on it, when there is one; the response bar; and
 * the booking bar. Those last two are the only parts of the page that *do*
 * anything. Everything below them is a record, split into five sections that
 * each fit a screen.
 *
 * THE FEEDBACK BANNER IS ABOVE THE TABS FOR A REASON. Notes on a quotation live
 * in `quotation_status_history.reason`, rendered only by the status trail, in
 * the last tab. A client whose quote has read `revised` for three days had no
 * way to see what they themselves had asked for without going and finding it.
 * It now sits between the hero and the actions, which is both where the
 * question is asked and the order it should be answered in.
 *
 * THE BOOKING BAR IS ABOVE THE TABS FOR THE SAME REASON. "Create booking" used
 * to live only on a card in Progress — the last tab, the one furthest right on
 * a bar that scrolls on a phone, and the one section the page describes to the
 * client as a record. An accepted quote is not finished: it has no date on it,
 * so nothing is on the vendor's calendar and there is nothing for escrow to
 * fund. Clients could not find the step that fixes that. It now takes the slot
 * the response bar vacates at the moment it vacates it — `accepted` is settled,
 * so the response bar renders nothing from then on — and the two read as one
 * place that always holds whatever is outstanding.
 *
 * The dialog behind it is mounted HERE rather than by either of the two cards
 * that open it. An inactive tab panel is unmounted, so a dialog owned by the
 * Progress card could only be opened from Progress — which is why the
 * quotations list's shortcut used to have to carry `?tab=progress&book=1` and
 * now needs only `?book=1`.
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
    offer,
    advance,
    tab,
    setTab,
    feedback,
    booking,
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

          <QuotationBookingBar booking={booking} />

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
            <QuoteSection
              quotation={quotation}
              items={items}
              pricing={pricing}
              offer={offer}
              vendorName={vendor?.business_name ?? null}
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
              quotationStatus={quotation.status}
              booking={booking}
            />
          </DetailTabPanel>

          {/* Mounted by the page so both entry points reach it — see above. */}
          <CreateBookingDialog
            quotation={quotation}
            vendor={vendor}
            event={event}
            pricing={pricing}
            offer={offer}
            open={booking.isDialogOpen}
            onClose={booking.closeDialog}
          />
        </>
      )}
    </QueryState>
  );
}
