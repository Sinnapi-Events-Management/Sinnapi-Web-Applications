import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Down for maintenance',
  robots: { index: false, follow: false },
};

// Reachable directly; a middleware toggle (platform_settings.maintenance_mode)
// can route all traffic here when maintenance is enabled.
export { default } from '@/containers/maintenance';
