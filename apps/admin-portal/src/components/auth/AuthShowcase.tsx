import { AuthShowcase as AuthShowcaseSurface } from '@sinnapi/ui';
import { APP } from '@/lib/config';
import authBackground from '@/assets/images/image-2.webp';
import logo from '@/assets/logo-light.png';
import { AUTH_ROTATE_MS, AUTH_SLIDES } from './authContent';

// Left brand panel: full-bleed photo behind the shared frosted-glass showcase,
// carrying admin-oriented value props. No CTA — admin access is invite-only.
export default function AuthShowcase() {
  return (
    <AuthShowcaseSurface
      brand={{ logoSrc: logo, name: APP.name, tagline: APP.tagline }}
      slides={AUTH_SLIDES}
      rotateMs={AUTH_ROTATE_MS}
      backdrop={{ kind: 'image', src: authBackground }}
    />
  );
}
