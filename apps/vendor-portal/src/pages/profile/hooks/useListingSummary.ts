import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CompletenessItem } from '@sinnapi/ui/profile';
import { APP } from '@/lib/config';
import type { VendorProfileEditModel } from '@/lib/types';
import { LISTING_CHECK_TARGETS, listingChecks, type BusinessSectionKey } from '../schema';

/**
 * What the listing header shows: the public URL, whether it can be previewed yet,
 * and the completeness checklist wired to the section that fixes each gap.
 *
 * Preview is blocked, with the reason as a tooltip, while the listing isn't
 * both active and public — the public site would only return a not-found page.
 */
export function useListingSummary(
  vendor: VendorProfileEditModel,
  savedRegionCount: number,
  goTo: (section: BusinessSectionKey) => void,
) {
  const navigate = useNavigate();
  const publicPath = `/vendors/${vendor.slug}`;
  const isLive = vendor.status === 'active' && vendor.visibility === 'public';

  const completeness: CompletenessItem[] = useMemo(
    () =>
      listingChecks(vendor, savedRegionCount).map((check) => {
        const target = LISTING_CHECK_TARGETS[check.key];
        return {
          ...check,
          onSelect: () => ('href' in target ? navigate(target.href) : goTo(target.section)),
        };
      }),
    [goTo, navigate, savedRegionCount, vendor],
  );

  return {
    publicUrl: `${APP.publicUrl.replace(/\/$/, '')}${publicPath}`,
    previewBlockedReason: isLive
      ? null
      : 'Your listing isn’t public yet — you can preview it once our review team publishes it.',
    completeness,
  };
}
