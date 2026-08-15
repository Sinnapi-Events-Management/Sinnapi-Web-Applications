import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PortalAccount, PortalBrand } from '@sinnapi/ui/router';
import LogoutIcon from '@mui/icons-material/Logout';
import StorefrontIcon from '@mui/icons-material/Storefront';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import SettingsIcon from '@mui/icons-material/Settings';
import { APP, NAV_SECTIONS } from '@/lib/config';
import { useAuth } from '@/auth/AuthProvider';
import { useProfile } from '@/hooks/queries';
import { useVendorContext } from '@/vendor/VendorProvider';
import { useTopBarMessages } from './useTopBarMessages';
import { useTopBarNotifications } from './useTopBarNotifications';

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
  const { vendor } = useVendorContext();

  // These own the always-on messaging subscription, mounted here rather than on
  // the inbox page so a message arriving while the vendor is on their bookings
  // still lights the badges. Without it they would only ever be correct on the
  // page that already shows the messages.
  const messages = useTopBarMessages();
  const notifications = useTopBarNotifications();

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

  // The sidebar's own badges. Same two numbers the top bar shows, read from the
  // feeds rather than fetched again, so the two can never disagree.
  const badges = useMemo(
    () => ({ notifications: notifications.unread, messages: messages.unread }),
    [notifications.unread, messages.unread],
  );

  return { brand: BRAND, sections: NAV_SECTIONS, account, badges, messages, notifications };
}
