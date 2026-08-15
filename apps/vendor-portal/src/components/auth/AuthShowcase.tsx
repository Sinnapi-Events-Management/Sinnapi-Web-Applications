import { AuthShowcase as AuthShowcaseSurface } from '@sinnapi/ui';
import { APP } from '@/lib/config';
import authBackground from '@/assets/images/image18.webp';
import { AUTH_ROTATE_MS, AUTH_SLIDES } from './authContent';

/**
 * Left brand panel: a full-bleed photo behind the shared frosted-glass
 * showcase, carrying vendor-oriented value props.
 *
 * The CTA points at the public application form rather than a sign-up route.
 * The `vendor` role is granted only when an application is approved, so a
 * self-service sign-up could only ever produce an account this portal's own
 * gate then refuses.
 */
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
      backdrop={{ kind: 'image', src: authBackground }}
      cta={{
        caption: 'Not on Sinnapi yet? Applications are reviewed within two business days.',
        label: 'Apply to become a vendor',
        href: `${APP.publicUrl}/apply`,
        external: true,
      }}
    />
  );
}
