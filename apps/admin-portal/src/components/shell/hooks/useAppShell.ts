import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PortalAccount, PortalBrand } from '@sinnapi/ui/router';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/PersonOutline';
import LockIcon from '@mui/icons-material/LockOutlined';
import { APP, NAV_SECTIONS } from '@/lib/config';
import { useAuth } from '@/auth/AuthProvider';
import { useAdmin } from '@/admin/AdminProvider';
import { useProfile, useUnreadCount } from '@/hooks/queries';
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
  const { data: unread = 0 } = useUnreadCount();

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

  const badges = useMemo(() => ({ notifications: unread }), [unread]);

  return { brand: BRAND, sections: NAV_SECTIONS, account, can: has, badges };
}
