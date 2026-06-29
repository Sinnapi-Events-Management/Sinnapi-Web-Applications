import type { ElementType } from 'react';
import {
  TravelExplore,
  RequestQuote,
  Lock,
  Forum,
  Assignment,
  VerifiedUser,
  RocketLaunch,
  TrendingUp,
} from '@sinnapi/ui/icons';

export type JourneyStep = { Icon: ElementType; title: string; body: string };

export type Journey = {
  /** Short chip label that names the audience, e.g. "For clients". */
  eyebrow: string;
  /** Timeline heading (rendered as h4). */
  title: string;
  /** One-line framing under the heading. */
  subtitle: string;
  steps: JourneyStep[];
};

// The client path mirrors the booking flow in the product spec:
// discover → compare quotations → book (direct or escrow) → manage & review.
export const CLIENT_JOURNEY: Journey = {
  eyebrow: 'For clients',
  title: 'Plan your event in four simple steps',
  subtitle:
    'From the first search to the final review, everything you need lives in one trusted place.',
  steps: [
    {
      Icon: TravelExplore,
      title: 'Discover vendors',
      body: 'Search verified vendors by service, region, and budget — from photographers and caterers to venues and décor.',
    },
    {
      Icon: RequestQuote,
      title: 'Compare quotes',
      body: 'Request quotations and compare them side by side, with transparent pricing and full vendor portfolios.',
    },
    {
      Icon: Lock,
      title: 'Book securely',
      body: 'Reserve your vendor and pay your way — directly, or through Sinnapi Escrow for complete peace of mind.',
    },
    {
      Icon: Forum,
      title: 'Manage & celebrate',
      body: 'Chat with your vendors, track every booking in one place, and leave a review once your event is done.',
    },
  ],
};

// The vendor path mirrors the onboarding workflow: apply → due diligence + MOU →
// 30-day trial then subscription → grow on the public marketplace.
export const VENDOR_JOURNEY: Journey = {
  eyebrow: 'For vendors',
  title: 'Get discovered and grow your business',
  subtitle:
    'Join a vetted marketplace built to give authentic providers the visibility they deserve.',
  steps: [
    {
      Icon: Assignment,
      title: 'Apply',
      body: 'Submit your application with your portfolio, documents, and verification details — it only takes a few minutes.',
    },
    {
      Icon: VerifiedUser,
      title: 'Get verified',
      body: 'Pass our due-diligence checks and sign the vendor MOU, so clients know you are authentic and trustworthy.',
    },
    {
      Icon: RocketLaunch,
      title: 'Go live',
      body: 'Launch your profile with a 30-day free trial, then choose the subscription plan that fits your business.',
    },
    {
      Icon: TrendingUp,
      title: 'Grow',
      body: 'Receive bookings, manage your payouts, and build a reputation that keeps clients coming back.',
    },
  ],
};

export const JOURNEYS: Journey[] = [CLIENT_JOURNEY, VENDOR_JOURNEY];
