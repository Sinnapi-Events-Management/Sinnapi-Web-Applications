import { PortalShell } from '@sinnapi/ui/router';
import { NotificationLiveProvider } from '@sinnapi/ui/notifications';
import ShellBanner from './components/ShellBanner';
import { useAppShell } from './hooks/useAppShell';
import { useShellBanner } from './hooks/useShellBanner';
import { useNotificationLiveConfig } from './hooks/useNotificationLiveConfig';

/**
 * The vendor portal's authenticated layout. The chrome — collapsible sidebar,
 * breadcrumbed top bar, focus/fullscreen/width controls — lives in
 * `PortalShell` so all three portals share one layout; this file supplies the
 * vendor's config plus the onboarding/subscription banner.
 *
 * The notification subscription is mounted here, above the chrome, rather than
 * on the notifications page where it used to live. A vendor works from their
 * bookings and quotes, not from their notification centre, and that is exactly
 * where the old arrangement went quiet.
 */
export default function AppShell() {
  const live = useNotificationLiveConfig();

  return (
    <NotificationLiveProvider {...live}>
      <PortalChrome />
    </NotificationLiveProvider>
  );
}

/**
 * The shell proper, split out because `useAppShell` reaches the live
 * subscription through context and so has to run *below* the provider.
 */
function PortalChrome() {
  const { brand, sections, account, badges, messages, notifications } = useAppShell();
  const banner = useShellBanner();

  return (
    <PortalShell
      portalId="vendor"
      brand={brand}
      sections={sections}
      account={account}
      badges={badges}
      messages={messages}
      notifications={notifications}
      banner={banner && <ShellBanner {...banner} />}
    />
  );
}
