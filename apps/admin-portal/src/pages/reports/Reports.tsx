import type { ComponentType } from 'react';
import PageTitle from '@/components/ui/PageTitle';
import { useReports } from './hooks/useReports';
import type { ReportCategory, ReportPeriod } from './schema';
import ReportTabs from './components/organisms/ReportTabs';
import RevenueReportPanel from './components/organisms/RevenueReportPanel';
import VendorReportPanel from './components/organisms/VendorReportPanel';
import SubscriptionReportPanel from './components/organisms/SubscriptionReportPanel';
import OperationsReportPanel from './components/organisms/OperationsReportPanel';

/** Every report panel shares the same props: the active window + its setter. */
export type ReportPanelProps = {
  period: ReportPeriod;
  onPeriodChange: (next: ReportPeriod) => void;
};

// Category → panel. Each panel owns its own data hook, toolbar and charts, so
// this page stays a thin router between the tab nav and the active report.
const PANELS: Record<ReportCategory, ComponentType<ReportPanelProps>> = {
  revenue: RevenueReportPanel,
  vendors: VendorReportPanel,
  subscriptions: SubscriptionReportPanel,
  operations: OperationsReportPanel,
};

export default function Reports() {
  const { category, setCategory, period, setPeriod } = useReports();
  const Panel = PANELS[category];

  return (
    <>
      <PageTitle
        title="Reports & analytics"
        subtitle="System-wide operational reporting across revenue, vendors, subscriptions and operations."
      />
      <ReportTabs value={category} onChange={setCategory} />
      <Panel period={period} onPeriodChange={setPeriod} />
    </>
  );
}
