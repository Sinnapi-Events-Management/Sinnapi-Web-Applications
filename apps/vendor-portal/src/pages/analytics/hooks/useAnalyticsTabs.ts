import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ANALYTICS_TABS,
  DEFAULT_ANALYTICS_TAB,
  isAnalyticsTab,
  type AnalyticsTab,
} from '../schema';

/**
 * Which panel is showing, mirrored into the URL.
 *
 * Mirrored rather than held in component state because an analytics panel is
 * the kind of thing a vendor links to — pasting a URL into a message to their
 * accountant, or bookmarking the reputation view — and because the browser
 * back button should step through panels rather than leaving the page.
 *
 * `replace` on change: four tabs clicked in a row should not put four entries
 * between the vendor and wherever they came from.
 */
export function useAnalyticsTabs() {
  const [params, setParams] = useSearchParams();

  const raw = params.get('view');
  const tab: AnalyticsTab = isAnalyticsTab(raw) ? raw : DEFAULT_ANALYTICS_TAB;

  const setTab = useCallback(
    (next: AnalyticsTab) => {
      setParams(
        (prev) => {
          const updated = new URLSearchParams(prev);
          // The default reads as no parameter at all, so a shared link to the
          // first panel is just the page's own address.
          if (next === DEFAULT_ANALYTICS_TAB) updated.delete('view');
          else updated.set('view', next);
          return updated;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const activeTab = ANALYTICS_TABS.find((t) => t.value === tab) ?? ANALYTICS_TABS[0];

  return { tabs: ANALYTICS_TABS, tab, activeTab, setTab };
}
