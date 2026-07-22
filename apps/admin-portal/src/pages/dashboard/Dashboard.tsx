import PageTitle from '@/components/ui/PageTitle';
import { useDashboard } from './hooks/useDashboard';
import DashboardWorkspace from './components/organisms/DashboardWorkspace';

/**
 * The admin landing page. State, permissions and the single overview read all
 * live in `useDashboard`; layout, tabs and section gating live in the workspace
 * — so this stays a wiring point between the two.
 */
export default function Dashboard() {
  const {
    period,
    setPeriod,
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
    canSee,
    isEmpty,
  } = useDashboard();

  return (
    <>
      <PageTitle title={title} subtitle="Here's what's happening across the marketplace." />
      <DashboardWorkspace
        period={period}
        onPeriodChange={setPeriod}
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
        canSee={canSee}
        isEmpty={isEmpty}
      />
    </>
  );
}
