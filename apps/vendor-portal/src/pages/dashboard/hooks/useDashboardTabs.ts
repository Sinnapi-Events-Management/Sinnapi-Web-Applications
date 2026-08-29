import { useState } from 'react';
import { DASHBOARD_TABS, DEFAULT_TAB, type DashboardTab } from '../schema';

/**
 * Which panel is showing. Trivial today — every vendor sees every tab — but it
 * keeps tab state out of the page's own hook, so adding a plan-gated tab later
 * is a change to this file rather than to the dashboard's data flow.
 */
export function useDashboardTabs() {
  const [tab, setTab] = useState<DashboardTab>(DEFAULT_TAB);
  const activeTab = DASHBOARD_TABS.find((t) => t.value === tab) ?? DASHBOARD_TABS[0];

  return { tabs: DASHBOARD_TABS, tab, activeTab, setTab };
}
