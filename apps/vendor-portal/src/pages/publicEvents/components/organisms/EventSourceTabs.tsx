import { StatusTabs } from '@sinnapi/ui';
import type { EventFacetCounts } from '@/lib/types';
import { sourceTabOptions } from '../../schema/presenter';

type EventSourceTabsProps = {
  value: string;
  onChange: (next: string) => void;
  facetCounts?: EventFacetCounts;
  /** Placeholders on the badges while the counts query is in flight. */
  loadingCounts?: boolean;
};

/**
 * All events / Open events / Inspiration, as a tab bar.
 *
 * Source used to be the fifth of six identical dropdowns, which buried the one
 * distinction that changes what a vendor can *do*: only client-posted events
 * accept an expression of interest — admin ones are inspiration and take no
 * action at all. Promoting it to tabs puts the actionable set one tap away and
 * makes the mode visible without opening anything.
 *
 * Reuses the kit's `StatusTabs` rather than a bespoke bar, so this reads and
 * behaves like the queue filters in every other portal — including the scroll
 * affordance a three-tab bar needs on a narrow phone.
 */
export default function EventSourceTabs({
  value,
  onChange,
  facetCounts,
  loadingCounts,
}: EventSourceTabsProps) {
  return (
    <StatusTabs
      options={sourceTabOptions(facetCounts?.source)}
      value={value}
      onChange={onChange}
      loadingCounts={loadingCounts}
      ariaLabel="Filter events by where they came from"
    />
  );
}
