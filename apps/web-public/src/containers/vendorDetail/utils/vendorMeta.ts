import { titleize } from '@/lib/config/site';

/**
 * Human-readable labels for the vendor enum fields (`pricing_model`,
 * `lead_time`, `years_in_operation`). The raw DB tokens (e.g. `3_5y`,
 * `2_4_weeks`) don't titleize cleanly, so these maps give the detail page
 * polished copy while falling back to `titleize` for any unmapped value.
 */
const PRICING_MODEL_LABELS: Record<string, string> = {
  fixed: 'Fixed price',
  hourly: 'Hourly rate',
  custom: 'Custom quote',
  combination: 'Flexible packages',
};

const LEAD_TIME_LABELS: Record<string, string> = {
  same_week: 'Same week',
  '1_2_weeks': '1–2 weeks',
  '2_4_weeks': '2–4 weeks',
  '1_3_months': '1–3 months',
  '3_plus_months': '3+ months',
};

const YEARS_LABELS: Record<string, string> = {
  lt_1y: 'Under 1 year',
  '1_3y': '1–3 years',
  '3_5y': '3–5 years',
  '5_10y': '5–10 years',
  '10y_plus': '10+ years',
};

export const pricingModelLabel = (value: string | null): string | null =>
  value ? (PRICING_MODEL_LABELS[value] ?? titleize(value)) : null;

export const leadTimeLabel = (value: string | null): string | null =>
  value ? (LEAD_TIME_LABELS[value] ?? titleize(value)) : null;

export const yearsLabel = (value: string | null): string | null =>
  value ? (YEARS_LABELS[value] ?? titleize(value)) : null;
