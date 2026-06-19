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
import type { SvgIconComponent } from '@mui/icons-material';

export const APP = {
  name: 'Sinnapi',
  publicUrl: import.meta.env.VITE_PUBLIC_URL ?? 'http://localhost:3000',
};

type NavItem = { label: string; to: string; icon: SvgIconComponent };

export const CLIENT_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: DashboardIcon },
  { label: 'Discover', to: '/discover', icon: SearchIcon },
  { label: 'Bookings', to: '/bookings', icon: EventNoteIcon },
  { label: 'Quotations', to: '/quotations', icon: RequestQuoteIcon },
  { label: 'My Events', to: '/my-events', icon: CelebrationIcon },
  { label: 'Messages', to: '/messages', icon: ChatIcon },
  { label: 'Payments', to: '/payments', icon: PaymentsIcon },
  { label: 'Escrow', to: '/escrow', icon: AccountBalanceIcon },
  { label: 'Reviews', to: '/reviews', icon: StarIcon },
  { label: 'Notifications', to: '/notifications', icon: NotificationsIcon },
];

export const ACCOUNT_NAV: NavItem[] = [
  { label: 'Profile', to: '/profile', icon: PersonIcon },
  { label: 'Settings', to: '/settings', icon: SettingsIcon },
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

export function titleize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
