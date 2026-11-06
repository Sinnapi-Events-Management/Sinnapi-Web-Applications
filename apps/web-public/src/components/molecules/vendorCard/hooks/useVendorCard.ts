import { formatMoney } from '@/lib/config/site';
import type { VendorCardModel } from '@/lib/types';

const PLACEHOLDER_IMAGE = '/placeholder-vendor.svg';

/**
 * Derives the display-ready values for a vendor card from its raw model.
 *
 * Pure, server-safe derivation (no React state) — keeps VendorCard a presentational
 * Server Component while isolating the price/image resolution logic for reuse and testing.
 */
export function useVendorCard(vendor: VendorCardModel) {
  const price = formatMoney(vendor.starting_price, vendor.starting_price_currency);
  // The business logo, when set, is shown whole on a light plate rather than
  // cropped like a cover photo. Only the fallbacks fill the frame.
  const logo = vendor.primary_image_url || null;
  const image = logo ?? vendor.profile_image_url ?? PLACEHOLDER_IMAGE;

  return { price, image, isLogo: !!logo };
}
