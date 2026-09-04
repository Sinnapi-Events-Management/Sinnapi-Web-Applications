import { DetailTabPanel, QueryState } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { usePaymentDetailPage } from './hooks/usePaymentDetailPage';
import PaymentHero from './components/organisms/PaymentHero';
import PaymentTabs from './components/molecules/PaymentTabs';
import TraceSection from './components/organisms/TraceSection';
import OverviewSection from './components/organisms/OverviewSection';
import TimelineSection from './components/organisms/TimelineSection';
import PayloadsSection from './components/organisms/PayloadsSection';
import ExceptionsSection from './components/organisms/ExceptionsSection';

/**
 * One payment as the console investigates it: the whole transaction in order,
 * what it is, who paid, what it funded, which deliveries the provider made,
 * the exact bodies on the wire, and what reconciliation has found.
 *
 * The page exists because tracing one bad transaction used to mean the SQL
 * editor: `payment_logs` and `payment_events` were readable and reachable from
 * nowhere. The trace section — the default, since 20260904 — is the one that
 * actually answers "what happened": before the correlation id existed, the
 * story was spread across seven tables joined by four different keys, and the
 * audit rows in the middle of it named nobody.
 *
 * Layout only. `usePaymentDetailPage` owns the read and the open section;
 * each section owns its own content.
 */
export default function PaymentDetail() {
  const { payment, isLoading, error, canReconcile, openExceptions, tab, setTab } =
    usePaymentDetailPage();

  return (
    <QueryState isLoading={isLoading} error={error}>
      {!payment ? (
        <EmptyState
          title="Payment not found"
          description="No payment has this id. It may have been quoted wrongly, or belong to a different environment."
          ctaLabel="Back to payments"
          ctaHref="/payments"
        />
      ) : (
        <>
          <PaymentHero payment={payment} />
          <PaymentTabs value={tab} onChange={setTab} openExceptions={openExceptions} />

          <DetailTabPanel value="trace" active={tab} idPrefix="payment">
            <TraceSection paymentId={payment.id} correlationId={payment.correlation_id} />
          </DetailTabPanel>
          <DetailTabPanel value="overview" active={tab} idPrefix="payment">
            <OverviewSection payment={payment} />
          </DetailTabPanel>
          <DetailTabPanel value="deliveries" active={tab} idPrefix="payment">
            <TimelineSection events={payment.events} />
          </DetailTabPanel>
          <DetailTabPanel value="payloads" active={tab} idPrefix="payment">
            <PayloadsSection logs={payment.logs} />
          </DetailTabPanel>
          <DetailTabPanel value="exceptions" active={tab} idPrefix="payment">
            <ExceptionsSection exceptions={payment.exceptions} canReconcile={canReconcile} />
          </DetailTabPanel>
        </>
      )}
    </QueryState>
  );
}
