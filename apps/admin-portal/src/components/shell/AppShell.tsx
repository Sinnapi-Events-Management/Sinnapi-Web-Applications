import { PortalShell } from '@sinnapi/ui/router';
import { useAppShell } from './hooks/useAppShell';

/**
 * Admin's authenticated layout. The chrome — collapsible sidebar, breadcrumbed
 * top bar, focus/fullscreen/width controls — lives in `PortalShell` so all
 * three portals share one layout; this file only supplies admin's config.
 */
export default function AppShell() {
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
