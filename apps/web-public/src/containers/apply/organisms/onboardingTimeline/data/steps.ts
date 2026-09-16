import type { ElementType } from 'react';
import { Description, FactCheck, Gavel, RocketLaunch, Celebration } from '@mui/icons-material';

export type OnboardingStep = { Icon: ElementType; title: string; body: string };

// The five onboarding stages, from application to going live. Preserves the
// original apply flow, reframed as a titled, scannable journey.
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    Icon: Description,
    title: 'Submit your application',
    body: 'Tell us your business name, contact details and the services you offer — it takes about two minutes.',
  },
  {
    Icon: FactCheck,
    title: 'We review & verify',
    body: 'Our team reviews your application and completes due diligence to keep the marketplace trusted.',
  },
  {
    Icon: Gavel,
    title: 'Sign the vendor MOU',
    body: 'Agree to the simple terms that keep bookings fair and protected for both sides.',
  },
  {
    Icon: RocketLaunch,
    title: 'Start your 30-day free trial',
    body: 'Get approved and explore every vendor tool free for 30 days — no card required.',
  },
  {
    Icon: Celebration,
    title: 'Go live to clients',
    body: 'Choose a subscription plan, publish your profile, and start receiving bookings.',
  },
];
