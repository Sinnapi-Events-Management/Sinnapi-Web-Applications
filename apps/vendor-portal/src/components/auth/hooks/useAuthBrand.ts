import { useTheme } from '@sinnapi/ui';
import { APP } from '@/lib/config';

/**
 * Brand details the auth shell renders: the mode-appropriate logo, where the
 * mark links, and the year in the copyright line.
 *
 * The logo swap mirrors `PortalShell`'s: `logo.png` carries dark ink, so on the
 * warm dark canvas it all but disappears — the light variant is used there
 * instead. Kept here rather than inline in the panel so the two components that
 * show the mark cannot drift apart on which asset they pick.
 */
export function useAuthBrand() {
  const { palette } = useTheme();

  return {
    logoSrc: palette.mode === 'dark' ? '/logo-light.png' : '/logo.png',
    name: APP.name,
    href: APP.publicUrl,
    year: new Date().getFullYear(),
  };
}
