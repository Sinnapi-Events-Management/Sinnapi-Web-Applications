import DashboardIcon from '@mui/icons-material/Dashboard';
import EventNoteIcon from '@mui/icons-material/EventNote';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import DescriptionIcon from '@mui/icons-material/Description';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import CollectionsIcon from '@mui/icons-material/Collections';
import CelebrationIcon from '@mui/icons-material/Celebration';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PaymentsIcon from '@mui/icons-material/Payments';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import DiscountIcon from '@mui/icons-material/Discount';
import StarIcon from '@mui/icons-material/Star';
import InsightsIcon from '@mui/icons-material/Insights';
import ChatIcon from '@mui/icons-material/Chat';
import NotificationsIcon from '@mui/icons-material/Notifications';
import StorefrontIcon from '@mui/icons-material/Storefront';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import SettingsIcon from '@mui/icons-material/Settings';
import type { SvgIconComponent } from '@mui/icons-material';

export const APP = {
  name: 'Sinnapi',
  tagline: 'Vendor',
  publicUrl: import.meta.env.VITE_PUBLIC_URL ?? 'http://localhost:3000',
};

type NavItem = { label: string; to: string; icon: SvgIconComponent };

export const PORTAL_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: DashboardIcon },
  { label: 'Bookings', to: '/bookings', icon: EventNoteIcon },
  { label: 'Quotations', to: '/quotations', icon: RequestQuoteIcon },
  { label: 'Templates', to: '/templates', icon: DescriptionIcon },
  { label: 'Calendar', to: '/calendar', icon: CalendarMonthIcon },
  { label: 'Services', to: '/services', icon: DesignServicesIcon },
  { label: 'Portfolio', to: '/portfolio', icon: CollectionsIcon },
  { label: 'Public Events', to: '/public-events', icon: CelebrationIcon },
  { label: 'Escrow', to: '/escrow', icon: AccountBalanceIcon },
  { label: 'Payouts', to: '/payouts', icon: PaymentsIcon },
  { label: 'Promotions', to: '/promotions', icon: LocalOfferIcon },
  { label: 'Discounts', to: '/discounts', icon: DiscountIcon },
  { label: 'Reviews', to: '/reviews', icon: StarIcon },
  { label: 'Analytics', to: '/analytics', icon: InsightsIcon },
  { label: 'Messages', to: '/messages', icon: ChatIcon },
  { label: 'Notifications', to: '/notifications', icon: NotificationsIcon },
];

export const ACCOUNT_NAV: NavItem[] = [
  { label: 'Business Profile', to: '/profile', icon: StorefrontIcon },
  { label: 'Subscription', to: '/subscription', icon: WorkspacePremiumIcon },
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
