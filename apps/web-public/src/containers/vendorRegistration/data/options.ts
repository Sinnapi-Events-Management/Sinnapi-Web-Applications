// Human labels for the DB enum values the vendor application collects. Values
// map 1:1 to the `vendor_application_intake` check constraints / shared enums.

export type Option = { value: string; label: string };

export const APPLICANT_TYPES: Option[] = [
  { value: 'individual', label: 'Individual' },
  { value: 'registered_business', label: 'Registered business' },
];

export const YEARS_OPTIONS: Option[] = [
  { value: 'lt_1y', label: 'Less than 1 year' },
  { value: '1_3y', label: '1–3 years' },
  { value: '3_5y', label: '3–5 years' },
  { value: '5_10y', label: '5–10 years' },
  { value: '10y_plus', label: '10+ years' },
];

export const PRICING_OPTIONS: Option[] = [
  { value: 'fixed', label: 'Fixed packages' },
  { value: 'hourly', label: 'Hourly rates' },
  { value: 'custom', label: 'Custom quotation per event' },
  { value: 'combination', label: 'A mix of the above' },
];

export const LEAD_TIME_OPTIONS: Option[] = [
  { value: 'same_week', label: 'Same week' },
  { value: '1_2_weeks', label: '1–2 weeks' },
  { value: '2_4_weeks', label: '2–4 weeks' },
  { value: '1_3_months', label: '1–3 months' },
  { value: '3_plus_months', label: '3+ months' },
];

// Term acceptances — keys match the form state / intake columns; each must be
// checked before the application can be submitted.
export const TERMS: { key: string; label: string; href?: string }[] = [
  {
    key: 'acceptedInfoAccuracy',
    label: 'I confirm that all information provided is accurate and truthful.',
  },
  {
    key: 'acceptedVendorTerms',
    label: "I agree to Sinnapi's Vendor Terms of Service.",
    href: '/vendor-terms',
  },
  {
    key: 'acceptedEscrowPolicy',
    label: "I agree to Sinnapi's Payment & Escrow Policy.",
    href: '/escrow-policy',
  },
  {
    key: 'acceptedFalseInfoRemoval',
    label:
      'I understand that false information will result in immediate removal from the platform.',
  },
];

// Upload constraints — mirror the `application-intake` bucket's allowed types.
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
export const DOC_ACCEPT = 'image/jpeg,image/png,application/pdf';
export const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime';
export const IMAGE_MAX_MB = 10;
export const DOC_MAX_MB = 20;
export const VIDEO_MAX_MB = 500;
