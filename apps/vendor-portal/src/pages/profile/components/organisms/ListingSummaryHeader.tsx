import { CompletenessMeter, ProfileSummaryHeader } from '@sinnapi/ui/profile';
import type { VendorProfileEditModel } from '@/lib/types';
import { useListingSummary } from '../../hooks/useListingSummary';
import type { BusinessSectionKey } from '../../schema';
import ListingBadges from '../atoms/ListingBadges';
import ListingLinkActions from '../molecules/ListingLinkActions';

type Props = {
  vendor: VendorProfileEditModel;
  savedRegionCount: number;
  onGoTo: (section: BusinessSectionKey) => void;
};

/**
 * The Business tab's header: logo, name, listing state, the public link, and how
 * complete the listing is.
 *
 * Replaces the old logo card and listing facts card, which took the whole side
 * column and repeated status and visibility twice. The vendor ID and "listed
 * since" rows are gone: support can look the vendor up by name or link.
 */
export default function ListingSummaryHeader({ vendor, savedRegionCount, onGoTo }: Props) {
  const { publicUrl, previewBlockedReason, completeness } = useListingSummary(
    vendor,
    savedRegionCount,
    onGoTo,
  );

  return (
    <ProfileSummaryHeader
      src={vendor.primary_image_url}
      name={vendor.business_name}
      subtitle={vendor.base_city}
      shape="rounded"
      badges={<ListingBadges status={vendor.status} visibility={vendor.visibility} />}
      onPictureClick={() => onGoTo('logo')}
      pictureLabel="Change business logo"
      actions={<ListingLinkActions publicUrl={publicUrl} blockedReason={previewBlockedReason} />}
    >
      <CompletenessMeter subject="Listing" items={completeness} />
    </ProfileSummaryHeader>
  );
}
