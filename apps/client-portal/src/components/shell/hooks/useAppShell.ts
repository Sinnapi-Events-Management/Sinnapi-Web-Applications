import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PortalAccount, PortalBrand } from '@sinnapi/ui/router';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/PersonOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import { APP, NAV_SECTIONS } from '@/lib/config';
import { useAuth } from '@/auth/AuthProvider';
import { useProfile, useUnreadCount } from '@/hooks/queries';

// Served from `public/`, so the paths are absolute rather than bundled imports.
const BRAND: PortalBrand = {
  name: APP.name,
  tagline: APP.tagline,
  logoSrc: '/logo.png',
  logoDarkSrc: '/logo-light.png',
  iconSrc: '/logo-icon.ico',
  homeTo: '/dashboard',
};

/**
 * Everything the client shell feeds into the shared `PortalShell`: identity for
 * the account menu and the unread count behind the notification badges. The
 * client portal has no permission gating, so no `can` predicate is supplied.
 */
export function useAppShell() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { data: profile } = useProfile();
  const { data: unread = 0 } = useUnreadCount();

  const name = profile?.full_name ?? user?.email ?? 'You';
  const email = profile?.email ?? user?.email ?? '';

  const account: PortalAccount = useMemo(
    () => ({
      name,
      subtitle: email,
      avatarUrl: profile?.avatar_url,
      items: [
        { label: 'Profile', icon: PersonIcon, to: '/profile' },
        { label: 'Settings', icon: SettingsIcon, to: '/settings' },
        {
          label: 'Sign out',
          icon: LogoutIcon,
          dividerBefore: true,
          onClick: async () => {
            await signOut();
            navigate('/sign-in', { replace: true });
          },
        },
      ],
    }),
    [name, email, profile?.avatar_url, signOut, navigate],
  );

  const badges = useMemo(() => ({ notifications: unread }), [unread]);

  return { brand: BRAND, sections: NAV_SECTIONS, account, badges };
}
