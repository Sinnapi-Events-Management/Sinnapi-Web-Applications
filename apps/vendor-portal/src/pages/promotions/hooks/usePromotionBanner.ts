import { useCoverUpload } from '@/hooks/useCoverUpload';

/**
 * A promotion's banner image, uploaded into the promotions folder.
 *
 * The mechanics — validation, the 16:7 crop, the local preview while the round
 * trip is in flight — live in `useCoverUpload`, shared with package covers so
 * the two surfaces cannot drift into accepting different files.
 */
export function usePromotionBanner(vendorId: string, onUploaded: (url: string) => void) {
  return useCoverUpload('promotions', vendorId, onUploaded);
}
