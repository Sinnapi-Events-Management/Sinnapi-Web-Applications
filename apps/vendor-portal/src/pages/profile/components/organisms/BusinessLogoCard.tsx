import { IdentityCard } from '@sinnapi/ui/profile';
import { useVendorLogo } from '../../hooks/useVendorLogo';
import ListingBadges from '../atoms/ListingBadges';

type Props = {
  vendorId: string;
  businessName: string;
  baseCity: string | null;
  logoUrl: string | null;
  status: string;
  visibility: string;
  onDone: (message: string) => void;
};

/**
 * The business listing's image and headline — what a client sees first.
 *
 * Rounded rather than circular, which is the one visual cue separating this from
 * the personal photo on the other tab: a circle reads as a person, a rounded
 * square reads as a brand. Worth being deliberate about, because the two upload
 * controls are otherwise identical and write to different records.
 *
 * The status chips ride in the card's banner rather than under the name. They
 * describe the listing's state, not the identity, and `ListingFactsCard` directly
 * below already spells the same two values out as labelled rows — leaving them
 * centred beneath the name put a duplicate of that table's first two rows a
 * centimetre above it.
 */
export default function BusinessLogoCard({
  vendorId,
  businessName,
  baseCity,
  logoUrl,
  status,
  visibility,
  onDone,
}: Props) {
  const { busy, error, displayUrl, upload, remove, maxSizeMb } = useVendorLogo(
    vendorId,
    logoUrl,
    onDone,
  );

  return (
    <IdentityCard
      src={displayUrl}
      name={businessName}
      subtitle={baseCity}
      busy={busy}
      error={error}
      maxSizeMb={maxSizeMb}
      shape="rounded"
      subject="business logo"
      helperText={`Drag an image here, or browse — up to ${maxSizeMb} MB. This appears on your public listing and in search results, so use your logo or your best work.`}
      onSelect={upload}
      onRemove={remove}
      badgePlacement="banner"
      badges={<ListingBadges status={status} visibility={visibility} />}
    />
  );
}
