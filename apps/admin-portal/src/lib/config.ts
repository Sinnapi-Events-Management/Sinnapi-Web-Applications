import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import StorefrontIcon from "@mui/icons-material/Storefront";
import EventNoteIcon from "@mui/icons-material/EventNote";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import CelebrationIcon from "@mui/icons-material/Celebration";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PaymentsIcon from "@mui/icons-material/Payments";
import ReplayIcon from "@mui/icons-material/Replay";
import GavelIcon from "@mui/icons-material/Gavel";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import PriceChangeIcon from "@mui/icons-material/PriceChange";
import PeopleIcon from "@mui/icons-material/People";
import SecurityIcon from "@mui/icons-material/Security";
import StarIcon from "@mui/icons-material/Star";
import ForumIcon from "@mui/icons-material/Forum";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import InsightsIcon from "@mui/icons-material/Insights";
import HistoryIcon from "@mui/icons-material/History";
import SettingsIcon from "@mui/icons-material/Settings";
import PolicyIcon from "@mui/icons-material/Policy";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import ChatIcon from "@mui/icons-material/Chat";
import NotificationsIcon from "@mui/icons-material/Notifications";
import type { SvgIconComponent } from "@mui/icons-material";

export const APP = { name: "Sinnapi", tagline: "Admin" };

export type NavItem = { label: string; to: string; icon: SvgIconComponent; perm?: string };
export type NavSection = { title: string; items: NavItem[] };

// `perm` undefined = visible to any admin. Otherwise gated by permission key.
export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Operations",
    items: [
      { label: "Dashboard", to: "/dashboard", icon: DashboardIcon },
      { label: "Applications", to: "/applications", icon: AssignmentTurnedInIcon, perm: "vendor.review" },
      { label: "Vendors", to: "/vendors", icon: StorefrontIcon, perm: "vendor.manage" },
      { label: "Bookings", to: "/bookings", icon: EventNoteIcon, perm: "bookings.read" },
      { label: "Quotations", to: "/quotations", icon: RequestQuoteIcon, perm: "quotations.read" },
      { label: "Events", to: "/events", icon: CelebrationIcon, perm: "events.manage" },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Escrow", to: "/escrow", icon: AccountBalanceIcon, perm: "escrow.read" },
      { label: "Payouts", to: "/payouts", icon: PaymentsIcon, perm: "payout.approve" },
      { label: "Refunds", to: "/refunds", icon: ReplayIcon, perm: "refund.approve" },
      { label: "Disputes", to: "/disputes", icon: GavelIcon, perm: "dispute.manage" },
      { label: "Payments", to: "/payments", icon: ReceiptLongIcon, perm: "payments.read" },
      { label: "Ledger", to: "/ledger", icon: MenuBookIcon, perm: "finance.read" },
      { label: "Subscriptions", to: "/subscriptions", icon: WorkspacePremiumIcon, perm: "subscriptions.manage" },
      { label: "Pricing Plans", to: "/pricing-plans", icon: PriceChangeIcon, perm: "plans.manage" },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Users", to: "/users", icon: PeopleIcon, perm: "users.read" },
      { label: "Roles & Permissions", to: "/rbac", icon: SecurityIcon, perm: "roles.manage" },
    ],
  },
  {
    title: "Content & Moderation",
    items: [
      { label: "Reviews", to: "/reviews-moderation", icon: StarIcon, perm: "moderation.manage" },
      { label: "Messaging", to: "/messaging", icon: ForumIcon, perm: "moderation.manage" },
      { label: "Notification Templates", to: "/notification-templates", icon: MarkEmailReadIcon, perm: "settings.manage" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Reports", to: "/reports", icon: InsightsIcon },
      { label: "Audit Log", to: "/audit", icon: HistoryIcon, perm: "audit.read" },
      { label: "Settings", to: "/settings", icon: SettingsIcon, perm: "settings.manage" },
      { label: "Retention", to: "/retention", icon: PolicyIcon, perm: "compliance.manage" },
      { label: "Erasure Requests", to: "/erasure", icon: DeleteSweepIcon, perm: "compliance.manage" },
    ],
  },
  {
    title: "Inbox",
    items: [
      { label: "Messages", to: "/messages", icon: ChatIcon },
      { label: "Notifications", to: "/notifications", icon: NotificationsIcon },
    ],
  },
];

export function formatMoney(amount: number | null | undefined, currency: string | null = "UGX"): string {
  if (amount == null) return "—";
  const cur = currency ?? "UGX";
  try {
    return new Intl.NumberFormat("en-UG", { style: "currency", currency: cur, maximumFractionDigits: cur === "UGX" ? 0 : 2 }).format(amount);
  } catch {
    return `${cur} ${amount.toLocaleString()}`;
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export function titleize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
