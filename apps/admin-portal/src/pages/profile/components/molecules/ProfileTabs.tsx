import { ProfileTabs as ProfileTabsBar, type ProfileTabItem } from '@sinnapi/ui/profile';
import PersonIcon from '@mui/icons-material/PersonOutline';
import LockIcon from '@mui/icons-material/LockOutlined';
import { PROFILE_TABS, type ProfileTab } from '../../schema';

type Props = {
  value: ProfileTab;
  onChange: (next: ProfileTab) => void;
};

/**
 * This page's labels and icons for the shared tab bar. Kept beside the page
 * rather than in `schema/` because it is display copy, and out of the shared kit
 * because each portal's sections differ.
 *
 * Keyed by the tab union rather than written out as an array, so adding a section
 * to `PROFILE_TABS` without labelling it here is a type error rather than a tab
 * that renders blank.
 */
const TAB_META: Record<ProfileTab, Omit<ProfileTabItem<ProfileTab>, 'value'>> = {
  profile: { label: 'Profile', icon: <PersonIcon fontSize="small" /> },
  security: { label: 'Security', icon: <LockIcon fontSize="small" /> },
};

const ITEMS = PROFILE_TABS.map((value) => ({ value, ...TAB_META[value] }));

export default function ProfileTabs({ value, onChange }: Props) {
  return (
    <ProfileTabsBar items={ITEMS} value={value} onChange={onChange} ariaLabel="Profile sections" />
  );
}
