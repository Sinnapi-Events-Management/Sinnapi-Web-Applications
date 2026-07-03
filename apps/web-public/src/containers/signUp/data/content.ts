import { PersonAdd, Storefront, Verified, Lock, Public } from '@mui/icons-material';
import type { AuthScreenProps } from '@/components/organisms/authScreen';
import { IMAGES } from '@/lib/assets';
import { SITE } from '@/lib/config/site';

/** All copy + routing for the sign-up split screen — the container just renders it. */
export const SIGN_UP_CONTENT: AuthScreenProps = {
  heading: 'Join Sinnapi',
  subheading: 'Tell us how you’ll use Sinnapi and we’ll set up the right experience for you.',
  panel: {
    eyebrow: 'Create account',
    title: 'Everything your event needs, discovered and booked in one place',
    subtitle:
      'Join a growing community of clients and verified vendors — start planning, or start earning, in minutes.',
    image: IMAGES.ceremonyAisle,
    highlights: [
      { Icon: Verified, text: 'Get discovered by clients across your region' },
      { Icon: Lock, text: 'Secure escrow protects every transaction' },
      { Icon: Public, text: 'Built for Uganda, ready to scale internationally' },
    ],
    trust: { rating: 4.9, caption: 'Join 1,200+ clients and vendors already on Sinnapi' },
  },
  roles: [
    {
      Icon: PersonAdd,
      title: 'I’m planning an event',
      description: 'Discover and book trusted vendors.',
      href: `${SITE.portalUrl}?role=client&mode=signup`,
      ctaLabel: 'Register as Client',
      featured: true,
    },
    {
      Icon: Storefront,
      title: 'I’m a service provider',
      description: 'Apply to list your business and get bookings.',
      href: 'apply/register',
      ctaLabel: 'Apply as Vendor',
    },
  ],
  altAction: { prompt: 'Already have an account?', label: 'Sign in', href: '/sign-in' },
};
