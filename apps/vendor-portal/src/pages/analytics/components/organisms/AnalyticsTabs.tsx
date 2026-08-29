import { StatusTabs } from '@sinnapi/ui';
import type { AnalyticsTab, AnalyticsTabDef } from '../../schema';

type Props = {
  tabs: AnalyticsTabDef[];
  value: AnalyticsTab;
  onChange: (next: AnalyticsTab) => void;
  /** Reviews still owed a public reply, badged on the Reputation tab. */
  unansweredReviews?: number;
};

/**
 * Panel navigation, on the shared `StatusTabs` so disclosure here matches every
 * queue and inbox in the portal — and the dashboard's own tab bar, which a
 * vendor will have used minutes earlier.
 *
 * Only Reputation carries a badge, because it is the only panel with work
 * waiting on it. The rest are readings, and badging a reading would train the
 * vendor to ignore the badge that means something.
 */
export default function AnalyticsTabs({ tabs, value, onChange, unansweredReviews }: Props) {
  return (
    <StatusTabs
      options={tabs.map((t) => ({
        value: t.value,
        label: t.label,
        count: t.value === 'reputation' ? unansweredReviews : undefined,
      }))}
      value={value}
      onChange={onChange}
      ariaLabel="Switch analytics view"
    />
  );
}
