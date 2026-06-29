// Static plan/feature matrix surfaced on the pricing page. The numbers here are
// indicative list prices kept in code so the marketing page can render instantly;
// the live, authoritative price each vendor pays is confirmed by admins during
// onboarding (see the disclaimer in GuaranteeNote). Update these when list pricing
// changes. Annual figures are the per-month equivalent when billed yearly.
export type BillingCycle = 'monthly' | 'annual';

export type Plan = {
  key: string;
  name: string;
  /** One-line positioning shown under the plan name. */
  tagline: string;
  highlight: boolean;
  /** UGX per month on month-to-month billing. */
  priceMonthly: number;
  /** UGX per month when billed annually (the discounted rate). */
  priceAnnual: number;
  features: string[];
};

export const CURRENCY = 'UGX';

export const PLANS: Plan[] = [
  {
    key: 'starter',
    name: 'Starter',
    tagline: 'Get discovered and start taking enquiries.',
    highlight: false,
    priceMonthly: 49_000,
    priceAnnual: 39_000,
    features: [
      'Verified Vendor Badge',
      'Up to 10 portfolio images',
      'Standard search placement',
      'Direct messaging',
      'Quote request system',
    ],
  },
  {
    key: 'professional',
    name: 'Professional',
    tagline: 'Stand out and convert more clients.',
    highlight: true,
    priceMonthly: 99_000,
    priceAnnual: 79_000,
    features: [
      'Verified Vendor Badge',
      'Unlimited portfolio images',
      'Portfolio video',
      'Priority search placement',
      'Direct messaging',
      'Client analytics',
      'Quote request system',
    ],
  },
  {
    key: 'elite',
    name: 'Elite',
    tagline: 'Maximum visibility and white-glove support.',
    highlight: false,
    priceMonthly: 199_000,
    priceAnnual: 159_000,
    features: [
      'Verified Vendor Badge',
      'Unlimited portfolio images',
      'Portfolio video',
      'Top-tier search placement',
      'Direct messaging',
      'Client analytics',
      'Homepage featured spot',
      'Dedicated account manager',
      'Quote request system',
    ],
  },
];

/** Whole-number percent saved by paying annually, for the billing toggle badge. */
export const ANNUAL_SAVING_PERCENT = Math.round(
  (1 - PLANS[1].priceAnnual / PLANS[1].priceMonthly) * 100,
);

/** Format a UGX figure with thousands separators, e.g. 99000 → "UGX 99,000". */
export function formatPrice(value: number): string {
  return `${CURRENCY} ${value.toLocaleString('en-US')}`;
}
