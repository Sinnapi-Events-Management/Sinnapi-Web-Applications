import { ProfileTabs as ProfileTabsBar, type ProfileTabItem } from '@sinnapi/ui/profile';
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined';
import PersonIcon from '@mui/icons-material/PersonOutline';
import { PROFILE_TABS, type ProfileTab } from '../../schema';

type Props = {
  value: ProfileTab;
  onChange: (next: ProfileTab) => void;
};

/**
 * This page's labels and icons for the shared tab bar.
 *
 * Keyed by the tab union rather than written out as an array, so adding a section
 * to `PROFILE_TABS` without labelling it here is a type error rather than a tab
 * that renders blank.
 */
const TAB_META: Record<ProfileTab, Omit<ProfileTabItem<ProfileTab>, 'value'>> = {
  business: { label: 'Business', icon: <StorefrontIcon fontSize="small" /> },
  personal: { label: 'Personal', icon: <PersonIcon fontSize="small" /> },
};

const ITEMS = PROFILE_TABS.map((value) => ({ value, ...TAB_META[value] }));

export default function ProfileTabs({ value, onChange }: Props) {
  return (
    <ProfileTabsBar items={ITEMS} value={value} onChange={onChange} ariaLabel="Profile sections" />
  );
}
