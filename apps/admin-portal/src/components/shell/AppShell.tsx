import { PortalShell } from '@sinnapi/ui/router';
import { NotificationLiveProvider } from '@sinnapi/ui/notifications';
import { useAppShell } from './hooks/useAppShell';
import { useNotificationLiveConfig } from './hooks/useNotificationLiveConfig';

/**
 * Admin's authenticated layout. The chrome — collapsible sidebar, breadcrumbed
 * top bar, focus/fullscreen/width controls — lives in `PortalShell` so all
 * three portals share one layout; this file only supplies admin's config.
 *
 * The notification subscription is mounted here. Admin never had one — the
 * console's bell only moved when some other query happened to refetch — so this
 * is the first arrangement in which an exception reaches an operator who is
 * looking at a different screen.
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
  const { brand, sections, account, can, badges, messages, notifications } = useAppShell();

  return (
    <PortalShell
      portalId="admin"
      brand={brand}
      sections={sections}
      account={account}
      can={can}
      badges={badges}
      messages={messages}
      notifications={notifications}
    />
  );
}
