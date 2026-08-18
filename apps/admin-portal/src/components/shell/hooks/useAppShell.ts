import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PortalAccount, PortalBrand } from '@sinnapi/ui/router';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/PersonOutline';
import LockIcon from '@mui/icons-material/LockOutlined';
import { APP, NAV_SECTIONS } from '@/lib/config';
import { useAuth } from '@/auth/AuthProvider';
import { useAdmin } from '@/admin/AdminProvider';
import { useProfile } from '@/hooks/queries';
import { useTopBarMessages } from './useTopBarMessages';
import { useTopBarNotifications } from './useTopBarNotifications';
import logo from '@/assets/logo.png';
import logoLight from '@/assets/logo-light.png';
import logoIcon from '@/assets/logo-icon.ico';

const BRAND: PortalBrand = {
  name: APP.name,
  tagline: APP.tagline,
  logoSrc: logo,
  logoDarkSrc: logoLight,
  iconSrc: logoIcon,
  homeTo: '/dashboard',
};

/**
 * Everything the admin shell feeds into the shared `PortalShell`: identity for
 * the account menu, the RBAC predicate that hides nav items, and the unread
 * count behind the notification badges.
 */
export function useAppShell() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { has, roles } = useAdmin();
  const { data: profile } = useProfile();

  // These own the always-on messaging subscription, mounted here rather than on
  // the inbox page so a message arriving while the operator is elsewhere in the
  // product still lights the badges. Without it they would only ever be correct
  // on the page that already shows the messages.
  const messages = useTopBarMessages();
  const notifications = useTopBarNotifications();

  const name = profile?.full_name ?? user?.email ?? 'Admin';

  const account: PortalAccount = useMemo(
    () => ({
      name,
      subtitle: roles.join(', ') || 'admin',
      avatarUrl: profile?.avatar_url,
      items: [
        { label: 'Profile', icon: PersonIcon, to: '/profile' },
        // Same page as above; `?tab=security` opens it on the password form
        // rather than the details.
        { label: 'Change password', icon: LockIcon, to: '/profile?tab=security' },
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
    [name, roles, profile?.avatar_url, signOut, navigate],
  );

  // The sidebar's own badges. Same two numbers the top bar shows, read from the
  // feeds rather than fetched again, so the two can never disagree.
  const badges = useMemo(
    () => ({ notifications: notifications.unread, messages: messages.unread }),
    [notifications.unread, messages.unread],
  );

  return {
    brand: BRAND,
    sections: NAV_SECTIONS,
    account,
    can: has,
    badges,
    messages,
    notifications,
  };
}
