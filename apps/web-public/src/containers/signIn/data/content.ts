import { Person, Storefront, Verified, Lock, Bolt } from '@sinnapi/ui/icons';
import type { AuthScreenProps } from '@/components/organisms/authScreen';
import { IMAGES } from '@/lib/assets';
import { SITE } from '@/lib/config/site';

const portal = SITE.portalUrl;

/** All copy + routing for the sign-in split screen — the container just renders it. */
export const SIGN_IN_CONTENT: AuthScreenProps = {
  heading: 'Welcome back',
  subheading: 'Choose how you’d like to sign in and pick up right where you left off.',
  panel: {
    eyebrow: 'Sign in',
    title: 'Your events, vendors and quotes — all in one place',
    subtitle:
      'Log back in to manage bookings, track quotations and message trusted vendors across Uganda and beyond.',
    image: IMAGES.receptionAutumn,
    highlights: [
      { Icon: Verified, text: 'Verified, authentic event service providers' },
      { Icon: Lock, text: 'Payments held safely in escrow until you confirm' },
      { Icon: Bolt, text: 'Discovery, quotes and booking in one flow' },
    ],
    trust: { rating: 4.9, caption: 'Trusted by 1,200+ clients and vendors' },
  },
  roles: [
    {
      Icon: Person,
      title: 'Client / Event Planner',
      description: 'Plan events, book vendors, and manage quotes.',
      href: `${portal}?role=client`,
      ctaLabel: 'Sign in as Client',
      featured: true,
    },
    {
      Icon: Storefront,
      title: 'Vendor',
      description: 'Manage your listing, bookings, and payouts.',
      href: `${portal}?role=vendor`,
      ctaLabel: 'Sign in as Vendor',
    },
  ],
  altAction: { prompt: 'New to Sinnapi?', label: 'Create an account', href: '/sign-up' },
};
