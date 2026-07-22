import StatusTabs from '@/components/ui/StatusTabs';
import type { DashboardTab, TabDef } from '../../schema';

type Props = {
  tabs: TabDef[];
  value: DashboardTab;
  onChange: (next: DashboardTab) => void;
  /** Total items awaiting action, badged on the Overview tab. */
  attentionCount?: number;
};

/**
 * Top-level dashboard navigation. Reuses the shared `StatusTabs` so the
 * dashboard's disclosure matches the Reports page and every admin queue.
 *
 * Overview carries a count badge because it is the only tab with work on it —
 * the badge is what lets an admin sitting on an analytics tab notice a backlog
 * building without switching back to look.
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
