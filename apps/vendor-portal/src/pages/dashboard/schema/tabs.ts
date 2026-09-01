/**
 * The dashboard's disclosure model.
 *
 * Level 1 is the Overview: what a vendor must see on opening the portal — the
 * money they are owed, the work waiting on a reply, and the dates they are
 * committed to. Analysis sits one click away on its own tab rather than stacked
 * below, because a single scroll of every chart is a wall of data, not a
 * dashboard.
 */
export type DashboardTab = 'overview' | 'earnings' | 'bookings' | 'reputation';

export type TabDef = {
  value: DashboardTab;
  label: string;
  /** Sits under the tab bar, naming what the panel answers. */
  description: string;
  /** "Go deeper" link, rendered once beside the description. */
  link?: { label: string; to: string };
};

export const DASHBOARD_TABS: TabDef[] = [
  {
    value: 'overview',
    label: 'Overview',
    description: 'What needs a reply today, what you are owed, and what is coming up.',
  },
  {
    value: 'earnings',
    label: 'Earnings',
    description: 'Money booked, money held in escrow and money already paid out.',
    link: { label: 'View payouts', to: '/payouts' },
  },
  {
    value: 'bookings',
    label: 'Bookings',
    description: 'Demand and what became of it: quotes sent, bookings won, jobs delivered.',
    link: { label: 'All bookings', to: '/bookings' },
  },
  {
    value: 'reputation',
    label: 'Reputation',
    description: 'How clients rate you, and which reviews are still waiting on a reply.',
    link: { label: 'All reviews', to: '/reviews' },
  },
];

export const DEFAULT_TAB: DashboardTab = 'overview';
