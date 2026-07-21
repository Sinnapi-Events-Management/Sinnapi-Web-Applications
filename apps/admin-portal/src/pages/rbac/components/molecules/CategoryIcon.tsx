import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import GroupIcon from '@mui/icons-material/Group';
import StorefrontIcon from '@mui/icons-material/Storefront';
import EventNoteIcon from '@mui/icons-material/EventNote';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import GavelIcon from '@mui/icons-material/Gavel';
import SettingsIcon from '@mui/icons-material/Settings';
import TuneIcon from '@mui/icons-material/Tune';

/**
 * Category key → glyph. Kept out of `schema/categories.ts` so that module stays
 * a plain data table with no JSX, and unknown categories still render — they
 * fall through to the neutral fallback rather than blanking the header.
 */
const ICONS: Record<string, React.ReactNode> = {
  rbac: <AdminPanelSettingsIcon />,
  finance: <AccountBalanceWalletIcon />,
  users: <GroupIcon />,
  vendor: <StorefrontIcon />,
  operations: <EventNoteIcon />,
  subscription: <CardMembershipIcon />,
  moderation: <GavelIcon />,
  system: <SettingsIcon />,
};

export default function CategoryIcon({ categoryKey }: { categoryKey: string }) {
  return <>{ICONS[categoryKey] ?? <TuneIcon />}</>;
}
