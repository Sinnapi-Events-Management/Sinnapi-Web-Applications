// Placeholder strategic partners (payments, logistics, hospitality, tourism).
// `logo` is optional — a missing/broken image falls back to the partner initial.
// Replace with real partners as agreements are signed.
export type Partner = { name: string; category: string; logo?: string };

export const PARTNERS: Partner[] = [
  { name: 'Pesapal', category: 'Payments & escrow', logo: 'https://logo.clearbit.com/pesapal.com' },
  { name: 'MTN MoMo', category: 'Mobile money', logo: 'https://logo.clearbit.com/mtn.co.ug' },
  { name: 'Airtel Money', category: 'Mobile money' },
  {
    name: 'Stanbic Bank',
    category: 'Banking partner',
    logo: 'https://logo.clearbit.com/stanbicbank.co.ug',
  },
  {
    name: 'DHL Uganda',
    category: 'Logistics & delivery',
    logo: 'https://logo.clearbit.com/dhl.com',
  },
  { name: 'Uganda Tourism Board', category: 'Tourism & venues' },
  { name: 'Speke Resort Munyonyo', category: 'Hospitality venue' },
  { name: 'Jumia Uganda', category: 'E-commerce', logo: 'https://logo.clearbit.com/jumia.com' },
];
