import { PortalShell } from '@sinnapi/ui/router';
import { NotificationLiveProvider } from '@sinnapi/ui/notifications';
import { useAppShell } from './hooks/useAppShell';
import { useNotificationLiveConfig } from './hooks/useNotificationLiveConfig';

/**
 * The client portal's authenticated layout. The chrome — collapsible sidebar,
 * breadcrumbed top bar, focus/fullscreen/width controls — lives in
 * `PortalShell` so all three portals share one layout; this file only supplies
 * the client's config.
 *
 * The notification subscription is mounted *here*, above the chrome, rather
 * than on the notifications page where it used to live. The shell renders on
 * every authenticated route, so this is the only position from which a
 * notification can reach the user wherever they happen to be working — which is
 * the whole difference between a badge that is correct and one that is correct
 * on one page.
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
 * The shell proper, split out for one structural reason: `useAppShell` reaches
 * the live subscription through context (its notification feed reads the
 * arrivals buffer), so it has to run *below* the provider. A single component
 * would have to call both at the same level, and the hook would be reading a
 * context its own render is what supplies.
 */
function PortalChrome() {
  const { brand, sections, account, badges, messages, notifications } = useAppShell();

  return (
    <PortalShell
      portalId="client"
      brand={brand}
      sections={sections}
      account={account}
      badges={badges}
      messages={messages}
      notifications={notifications}
    />
  );
}
