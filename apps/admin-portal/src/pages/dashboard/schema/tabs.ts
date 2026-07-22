import type { SectionKey } from './sections';

/**
 * The dashboard's disclosure model.
 *
 * Level 1 is the Overview: the handful of things an admin must see on load —
 * the lead revenue figure, what needs actioning, and what just happened. Every
 * deeper analysis sits one click away on its own tab rather than stacked below,
 * because a single scroll of eleven charts is a wall of data, not a dashboard.
 *
 * Tabs (rather than expanders or drill-through) because the Reports page already
 * navigates this way — disclosure should feel like the same hand designed both.
 */
export type DashboardTab = 'overview' | 'subscriptions' | 'revenue' | 'growth';

export type TabDef = {
  value: DashboardTab;
  label: string;
  /** Sits under the tab bar, naming what the panel answers. */
  description: string;
  /**
   * The permission-gated section this tab renders. Overview has none — it
   * composes whatever the admin can see and is always available.
   */
  section: SectionKey | null;
  /** "Go deeper" link, rendered once beside the description. */
  link?: { label: string; to: string };
};

export const DASHBOARD_TABS: TabDef[] = [
  {
    value: 'overview',
    label: 'Overview',
    description: 'What needs your attention right now, and how the platform is tracking.',
    section: null,
  },
  {
    value: 'subscriptions',
    label: 'Subscriptions',
    description: 'Recurring plan revenue, churn, plan mix and trial conversion.',
    section: 'subscriptions',
    link: { label: 'Manage plans', to: '/subscriptions' },
  },
  {
    value: 'revenue',
    label: 'Revenue',
    description: 'Transactional income: gross payments, commission, escrow and refunds.',
    section: 'finance',
    link: { label: 'Full revenue report', to: '/reports' },
  },
  {
    value: 'growth',
    label: 'Growth',
    description: 'Supply and demand: vendor signups, booking volume and conversion.',
    section: 'growth',
    link: { label: 'Full growth report', to: '/reports' },
  },
];

export const DEFAULT_TAB: DashboardTab = 'overview';
