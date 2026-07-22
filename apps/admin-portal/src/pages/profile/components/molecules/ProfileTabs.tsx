import { Box, Tab, Tabs } from '@sinnapi/ui';
import PersonIcon from '@mui/icons-material/PersonOutline';
import LockIcon from '@mui/icons-material/LockOutlined';
import { PROFILE_TABS, type ProfileTab } from '../../schema';

type Props = {
  value: ProfileTab;
  onChange: (next: ProfileTab) => void;
};

const TAB_LABELS: Record<ProfileTab, string> = {
  profile: 'Profile',
  security: 'Security',
};

const TAB_ICONS: Record<ProfileTab, React.ReactElement> = {
  profile: <PersonIcon fontSize="small" />,
  security: <LockIcon fontSize="small" />,
};

/**
 * The section switcher. Values are the tab *names* rather than indices so the
 * URL stays readable and adding a section later can't silently re-point an
 * existing link.
 */
export default function ProfileTabs({ value, onChange }: Props) {
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
      <Tabs
        value={value}
        onChange={(_, next: ProfileTab) => onChange(next)}
        variant="scrollable"
        allowScrollButtonsMobile
        aria-label="Profile sections"
      >
        {PROFILE_TABS.map((tab) => (
          <Tab
            key={tab}
            value={tab}
            label={TAB_LABELS[tab]}
            icon={TAB_ICONS[tab]}
            iconPosition="start"
            sx={{ minHeight: 48 }}
          />
        ))}
      </Tabs>
    </Box>
  );
}
