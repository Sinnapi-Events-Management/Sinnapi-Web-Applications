/**
 * The Analytics page's disclosure model.
 *
 * The page tabs for the same reason the dashboard does: stacking four bands of
 * KPI tiles and charts into one scroll produces eleven peer tiles with no
 * hierarchy, which is a wall of data rather than an analysis. One panel mounts
 * at a time, and each answers exactly one question.
 *
 * Where the dashboard's tabs report the *figures*, these report their
 * *sources* — the same period, one level deeper. That is the whole difference
 * between the two pages, and it is why "Clients & services" has no counterpart
 * on the dashboard: attribution is analysis, not today's work.
 */
export type AnalyticsTab = 'earnings' | 'demand' | 'clients' | 'reputation';

export type AnalyticsTabDef = {
  value: AnalyticsTab;
  label: string;
  /** Sits under the tab bar, naming what the panel answers. */
  description: string;
  /** The one "act on this" link belonging to the panel. */
  link?: { label: string; to: string };
};

export const ANALYTICS_TABS: AnalyticsTabDef[] = [
  {
    value: 'earnings',
    label: 'Earnings',
    description:
      'Where your money is and how it moved: booked into escrow, paid out, and the platform’s cut.',
    link: { label: 'View payouts', to: '/payouts' },
  },
  {
    value: 'demand',
    label: 'Demand',
    description: 'Requests, what you won, how fast you answered, and how far ahead clients commit.',
    link: { label: 'All quotations', to: '/quotations' },
  },
  {
    value: 'clients',
    label: 'Clients & services',
    description:
      'Which services and packages earn, what kind of events book you, and who comes back.',
    link: { label: 'Manage packages', to: '/packages' },
  },
  {
    value: 'reputation',
    label: 'Reputation',
    description: 'How clients score you, and how reliably you answer what they write.',
    link: { label: 'All reviews', to: '/reviews' },
  },
];

export const DEFAULT_ANALYTICS_TAB: AnalyticsTab = 'earnings';

export function isAnalyticsTab(value: string | null): value is AnalyticsTab {
  return ANALYTICS_TABS.some((t) => t.value === value);
}
