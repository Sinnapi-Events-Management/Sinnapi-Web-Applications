import { Alert, PageTitle, QueryState, StatusChip } from '@sinnapi/ui';
import { formatDate } from '@/lib/config';
import { useDashboard } from './hooks/useDashboard';
import DashboardWorkspace from './components/organisms/DashboardWorkspace';
import ApplicationStatusCard from './components/organisms/ApplicationStatusCard';

/**
 * The vendor's landing page. State, the vendor record and the single overview
 * read all live in `useDashboard`; layout, tabs and every panel live in the
 * workspace — so this stays a wiring point between the two, plus the one branch
 * that decides which of the two screens a caller gets.
 */
export default function Dashboard() {
  const {
    vendor,
    subscription,
    loading,
    application,
    period,
    setPeriod,
    periodLabel,
    tabs,
    tab,
    activeTab,
    setTab,
    attentionCount,
    title,
    data,
    isLoading,
    isRefreshing,
    error,
    refresh,
  } = useDashboard();

  // Nothing can be decided until we know whether this owner has a vendor.
  if (loading) {
    return (
      <QueryState isLoading error={null}>
        {null}
      </QueryState>
    );
  }

  if (!vendor) {
    return (
      <>
        <PageTitle
          title="Welcome to Sinnapi for Vendors"
          subtitle="Let's get your business listed."
        />
        <ApplicationStatusCard application={application.data} loading={application.isLoading} />
      </>
    );
  }

  return (
    <>
      <PageTitle
        title={title}
        subtitle={`Here's how ${vendor.business_name} is tracking.`}
        action={subscription && <StatusChip status={subscription.status} size="medium" />}
      />

      {subscription?.status === 'trialing' && vendor.trial_ends_at && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Free trial active — ends {formatDate(vendor.trial_ends_at)}. Choose a plan before then to
          stay visible.
        </Alert>
      )}

      <DashboardWorkspace
        period={period}
        onPeriodChange={setPeriod}
        periodLabel={periodLabel}
        tab={tab}
        onTabChange={setTab}
        tabs={tabs}
        activeTab={activeTab}
        attentionCount={attentionCount}
        data={data}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        error={error}
        onRefresh={refresh}
      />
    </>
  );
}
