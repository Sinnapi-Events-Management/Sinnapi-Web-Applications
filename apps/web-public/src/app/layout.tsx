import type { Metadata } from 'next';
import { Box } from '@sinnapi/ui/atoms';
import { ColorSchemeScript } from '@sinnapi/ui/theme';
import Providers from './providers';
import PublicNavbar from '@/components/organisms/publicNavbar';
import PublicFooter from '@/components/organisms/publicFooter';
import WhatsAppFab from '@/components/atoms/whatsAppFab';
import { SITE } from '@/lib/config/site';
import { fontVariables } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  icons: { icon: '/favicon.ico' },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: SITE.name,
    description: SITE.description,
    url: SITE.url,
  },
  twitter: { card: 'summary_large_image', title: SITE.name, description: SITE.description },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        {/* Applies the persisted color scheme before paint — must stay first in <body>. */}
        <ColorSchemeScript />
        <Providers>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
            <PublicNavbar />
            <Box component="main" sx={{ flex: 1 }}>
              {children}
            </Box>
            <PublicFooter />
          </Box>
          <WhatsAppFab />
        </Providers>
      </body>
    </html>
  );
}
