import DashboardIcon from '@mui/icons-material/Dashboard';
import SearchIcon from '@mui/icons-material/Search';
import EventNoteIcon from '@mui/icons-material/EventNote';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import CelebrationIcon from '@mui/icons-material/Celebration';
import ChatIcon from '@mui/icons-material/Chat';
import PaymentsIcon from '@mui/icons-material/Payments';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import StarIcon from '@mui/icons-material/Star';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import type { PortalNavItem, PortalNavSection } from '@sinnapi/ui/router';

export const APP = {
  name: 'Sinnapi',
  // Shown as the pill beside the wordmark on auth screens, mirroring the admin
  // portal's "Admin" badge.
  tagline: 'Clients',
  publicUrl: import.meta.env.VITE_PUBLIC_URL ?? 'http://localhost:3000',
};

// Nav shape is owned by the shared `PortalShell`, so admin, client and vendor
// configs stay interchangeable. Aliased for readability at the call sites.
export type NavItem = PortalNavItem;
export type NavSection = PortalNavSection;

/**
 * Sidebar groups, mirroring admin's sectioned nav. Ordered by how a client
 * actually moves through the product: find a vendor, plan the event, settle the
 * money, then handle correspondence and account admin.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: DashboardIcon },
      { label: 'Discover', to: '/discover', icon: SearchIcon },
    ],
  },
  {
    title: 'Planning',
    items: [
      { label: 'My Events', to: '/my-events', icon: CelebrationIcon },
      { label: 'Bookings', to: '/bookings', icon: EventNoteIcon },
      { label: 'Quotations', to: '/quotations', icon: RequestQuoteIcon },
      { label: 'Reviews', to: '/reviews', icon: StarIcon },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Payments', to: '/payments', icon: PaymentsIcon },
      { label: 'Escrow', to: '/escrow', icon: AccountBalanceIcon },
    ],
  },
  {
    title: 'Inbox',
    items: [
      { label: 'Messages', to: '/messages', icon: ChatIcon },
      {
        label: 'Notifications',
        to: '/notifications',
        icon: NotificationsIcon,
        badgeKey: 'notifications',
      },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', to: '/profile', icon: PersonIcon },
      { label: 'Settings', to: '/settings', icon: SettingsIcon },
    ],
  },
];

export function formatMoney(
  amount: number | null | undefined,
  currency: string | null = 'UGX',
): string {
  if (amount == null) return '—';
  const cur = currency ?? 'UGX';
  try {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: cur === 'UGX' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${cur} ${amount.toLocaleString()}`;
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Date plus wall-clock time, for audit-style trails where the hour matters. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function titleize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
