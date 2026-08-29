import { StatusTabs } from '@sinnapi/ui';
import type { DashboardTab, TabDef } from '../../schema';

type Props = {
  tabs: TabDef[];
  value: DashboardTab;
  onChange: (next: DashboardTab) => void;
  /** Items awaiting a reply, badged on the Overview tab. */
  attentionCount?: number;
};

/**
 * Top-level dashboard navigation, on the shared `StatusTabs` so disclosure here
 * matches every queue and inbox in the portal.
 *
 * Overview carries the count badge because it is the only tab with work on it —
 * the badge is what lets a vendor sitting on an analytics tab notice requests
 * arriving without switching back to look.
 */
export default function DashboardTabs({ tabs, value, onChange, attentionCount }: Props) {
  return (
    <StatusTabs
      options={tabs.map((t) => ({
        value: t.value,
        label: t.label,
        count: t.value === 'overview' ? attentionCount : undefined,
      }))}
      value={value}
      onChange={onChange}
      ariaLabel="Switch dashboard view"
    />
  );
}
