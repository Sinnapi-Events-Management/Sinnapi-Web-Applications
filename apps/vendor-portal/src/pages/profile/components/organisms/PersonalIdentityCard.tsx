import { IdentityCard } from '@sinnapi/ui/profile';
import { useVendorAvatar } from '../../hooks/useVendorAvatar';

type Props = {
  profileId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  onDone: (message: string) => void;
};

/**
 * The vendor's own photo and name — the person, not the business.
 *
 * Circular, against the business logo's rounded square, so the two upload cards
 * can't be mistaken for each other. This one is what clients see beside your
 * messages; the logo is what they see on your listing.
 */
export default function PersonalIdentityCard({ profileId, name, email, avatarUrl, onDone }: Props) {
  const { busy, error, displayUrl, upload, remove, maxSizeMb } = useVendorAvatar(
    profileId,
    avatarUrl,
    onDone,
  );

  return (
    <IdentityCard
      src={displayUrl}
      name={name}
      subtitle={email}
      busy={busy}
      error={error}
      maxSizeMb={maxSizeMb}
      subject="profile photo"
      helperText={`Drag an image here, or browse — up to ${maxSizeMb} MB. Shown beside your messages to clients.`}
      onSelect={upload}
      onRemove={remove}
    />
  );
}
