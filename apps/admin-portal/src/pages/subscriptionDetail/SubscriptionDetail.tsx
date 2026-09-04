import { DetailTabPanel, QueryState } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { useSubscriptionDetailPage } from './hooks/useSubscriptionDetailPage';
import SubscriptionHero from './components/organisms/SubscriptionHero';
import SubscriptionTabs from './components/molecules/SubscriptionTabs';
import OverviewSection from './components/organisms/OverviewSection';
import PaymentsSection from './components/organisms/PaymentsSection';
import TimelineSection from './components/organisms/TimelineSection';

/**
 * One vendor subscription as Finance reads it: where it stands, who paid
 * what and when, and the event stream that ties each change to its payment.
 *
 * Layout only. `useSubscriptionDetailPage` owns the read and the open
 * section; each section owns its own content. The page has no write of its
 * own: hiding a vendor is done on the vendor page, and a plan only changes
 * when the vendor pays.
 */
export default function SubscriptionDetail() {
  const { subscription, isLoading, error, succeededPayments, tab, setTab } =
    useSubscriptionDetailPage();

  return (
    <QueryState isLoading={isLoading} error={error}>
      {!subscription ? (
        <EmptyState
          title="Subscription not found"
          description="No subscription has this id. It may have been quoted wrongly, or belong to a different environment."
          ctaLabel="Back to subscriptions"
          ctaHref="/subscriptions"
        />
      ) : (
        <>
          <SubscriptionHero subscription={subscription} />
          <SubscriptionTabs value={tab} onChange={setTab} succeededPayments={succeededPayments} />

          <DetailTabPanel value="overview" active={tab} idPrefix="subscription">
            <OverviewSection subscription={subscription} />
          </DetailTabPanel>
          <DetailTabPanel value="payments" active={tab} idPrefix="subscription">
            <PaymentsSection payments={subscription.payments} />
          </DetailTabPanel>
          <DetailTabPanel value="timeline" active={tab} idPrefix="subscription">
            <TimelineSection events={subscription.events} />
          </DetailTabPanel>
        </>
      )}
    </QueryState>
  );
}
