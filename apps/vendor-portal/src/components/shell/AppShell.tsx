import { PortalShell } from '@sinnapi/ui/router';
import ShellBanner from './components/ShellBanner';
import { useAppShell } from './hooks/useAppShell';
import { useShellBanner } from './hooks/useShellBanner';

/**
 * The vendor portal's authenticated layout. The chrome — collapsible sidebar,
 * breadcrumbed top bar, focus/fullscreen/width controls — lives in
 * `PortalShell` so all three portals share one layout; this file supplies the
 * vendor's config plus the onboarding/subscription banner.
 */
export default function AppShell() {
  const { brand, sections, account, badges } = useAppShell();
  const banner = useShellBanner();

  return (
    <PortalShell
      portalId="vendor"
      brand={brand}
      sections={sections}
      account={account}
      badges={badges}
      notificationsTo="/notifications"
      banner={banner && <ShellBanner {...banner} />}
    />
  );
}
