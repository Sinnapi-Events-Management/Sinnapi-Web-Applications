import { useCoverUpload } from '@/hooks/useCoverUpload';

/**
 * A package's cover image, uploaded into the packages folder.
 *
 * The mechanics live in `useCoverUpload`, which promotion banners share — see
 * there for why the URL is handed back rather than written.
 */
export function usePackageCover(vendorId: string, onUploaded: (url: string) => void) {
  return useCoverUpload('packages', vendorId, onUploaded);
}
