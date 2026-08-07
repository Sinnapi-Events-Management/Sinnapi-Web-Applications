import { PortalShell } from '@sinnapi/ui/router';
import { useAppShell } from './hooks/useAppShell';

/**
 * The client portal's authenticated layout. The chrome — collapsible sidebar,
 * breadcrumbed top bar, focus/fullscreen/width controls — lives in
 * `PortalShell` so all three portals share one layout; this file only supplies
 * the client's config.
 */
export default function AppShell() {
  const { brand, sections, account, badges } = useAppShell();

  return (
    <PortalShell
      portalId="client"
      brand={brand}
      sections={sections}
      account={account}
      badges={badges}
      notificationsTo="/notifications"
    />
  );
}
