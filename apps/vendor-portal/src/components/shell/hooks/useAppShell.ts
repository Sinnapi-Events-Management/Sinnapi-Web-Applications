import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PortalAccount, PortalBrand } from '@sinnapi/ui/router';
import LogoutIcon from '@mui/icons-material/Logout';
import StorefrontIcon from '@mui/icons-material/Storefront';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import SettingsIcon from '@mui/icons-material/Settings';
import { APP, NAV_SECTIONS } from '@/lib/config';
import { useAuth } from '@/auth/AuthProvider';
import { useProfile, useUnreadCount } from '@/hooks/queries';
import { useVendorContext } from '@/vendor/VendorProvider';

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
 * Everything the vendor shell feeds into the shared `PortalShell`. Identity
 * leans on the business rather than the person — a vendor recognises their
 * storefront name and logo before their own — falling back to the user profile
 * until onboarding completes.
 */
export function useAppShell() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { data: profile } = useProfile();
  const { data: unread = 0 } = useUnreadCount();
  const { vendor } = useVendorContext();

  const name = vendor?.business_name ?? profile?.full_name ?? user?.email ?? 'You';
  const email = profile?.email ?? user?.email ?? '';

  const account: PortalAccount = useMemo(
    () => ({
      name,
      subtitle: email,
      avatarUrl: vendor?.primary_image_url ?? profile?.avatar_url,
      items: [
        { label: 'Business Profile', icon: StorefrontIcon, to: '/profile' },
        { label: 'Subscription', icon: WorkspacePremiumIcon, to: '/subscription' },
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
    [name, email, vendor?.primary_image_url, profile?.avatar_url, signOut, navigate],
  );

  const badges = useMemo(() => ({ notifications: unread }), [unread]);

  return { brand: BRAND, sections: NAV_SECTIONS, account, badges };
}
