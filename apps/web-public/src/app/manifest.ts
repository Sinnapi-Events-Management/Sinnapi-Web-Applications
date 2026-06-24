import type { MetadataRoute } from 'next';
import { palette } from '@sinnapi/ui/tokens';
import { SITE } from '@/lib/config/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.name,
    description: SITE.description,
    start_url: '/',
    display: 'standalone',
    background_color: palette.light.background.default,
    theme_color: palette.light.primary.main,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
