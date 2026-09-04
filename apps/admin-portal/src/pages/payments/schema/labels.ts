import { titleize } from '@/lib/config';
import { PAYMENT_PROVIDERS, PAYMENT_PURPOSES } from '@/lib/status';

/** What each enum value means, in a Finance admin's terms. */
const PURPOSE_LABEL: Record<string, string> = {
  escrow_funding: 'Escrow funding',
  booking_direct: 'Direct booking',
  subscription: 'Subscription',
};

const PROVIDER_LABEL: Record<string, string> = {
  pesapal: 'Pesapal',
  paypal: 'PayPal',
};

const METHOD_LABEL: Record<string, string> = {
  mtn_momo: 'MTN MoMo',
  airtel_money: 'Airtel Money',
  card: 'Card',
};

export const purposeLabel = (value: string): string => PURPOSE_LABEL[value] ?? titleize(value);
export const providerLabel = (value: string): string => PROVIDER_LABEL[value] ?? titleize(value);
export const methodLabel = (value: string): string => METHOD_LABEL[value] ?? titleize(value);

export type FilterOption = { value: string; label: string };

export const PROVIDER_OPTIONS: FilterOption[] = PAYMENT_PROVIDERS.map((value) => ({
  value,
  label: providerLabel(value),
}));

export const PURPOSE_OPTIONS: FilterOption[] = PAYMENT_PURPOSES.map((value) => ({
  value,
  label: purposeLabel(value),
}));
