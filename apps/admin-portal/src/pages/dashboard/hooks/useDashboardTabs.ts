import { useMemo, useState } from 'react';
import { DASHBOARD_TABS, DEFAULT_TAB, type DashboardTab, type SectionKey } from '../schema';

/**
 * Which tabs this admin gets, and which one is active.
 *
 * A tab is present only when its section is permitted; Overview has no section
 * and is always there. The active tab is *derived* rather than trusted from
 * state — permissions load asynchronously, so a tab that was valid a moment ago
 * can disappear underneath the selection, and falling back to the first
 * available tab avoids rendering a panel the admin cannot see.
 */
export function useDashboardTabs(canSee: (key: SectionKey) => boolean) {
  const [requested, setRequested] = useState<DashboardTab>(DEFAULT_TAB);

  const tabs = useMemo(
    () => DASHBOARD_TABS.filter((t) => t.section === null || canSee(t.section)),
    [canSee],
  );

  const activeTab = tabs.find((t) => t.value === requested) ?? tabs[0];

  return {
    tabs,
    tab: activeTab?.value ?? DEFAULT_TAB,
    activeTab: activeTab ?? DASHBOARD_TABS[0],
    setTab: setRequested,
  };
}
