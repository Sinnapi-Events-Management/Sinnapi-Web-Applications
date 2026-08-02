import { AuthShowcase as AuthShowcaseSurface } from '@sinnapi/ui';
import { APP } from '@/lib/config';
import { AUTH_ROTATE_MS, AUTH_SLIDES } from './authContent';

// Left auth panel for the client portal: the marketing footage stays as a
// blurred full-bleed backdrop, and the frosted-glass card carries the value
// props that should turn a visitor into a signed-up client.
export default function AuthShowcase() {
  return (
    <AuthShowcaseSurface
      brand={{
        logoSrc: '/logo-light.png',
        name: APP.name,
        tagline: APP.tagline,
        href: APP.publicUrl,
      }}
      slides={AUTH_SLIDES}
      rotateMs={AUTH_ROTATE_MS}
      // Square (1:1) master on purpose — this panel is portrait-ish, so a 16:9
      // asset loses about half its width to object-fit:cover. Keep any
      // replacement square. Provenance in public/videos/ATTRIBUTION.md.
      backdrop={{ kind: 'video', src: '/videos/auth-hero.mp4' }}
      cta={{
        caption: 'Still deciding? Browse vendors, packages and real event inspiration first.',
        label: `Explore ${APP.name}`,
        href: APP.publicUrl,
        external: true,
      }}
    />
  );
}
