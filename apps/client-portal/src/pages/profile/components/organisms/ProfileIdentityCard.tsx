import { IdentityCard } from '@sinnapi/ui/profile';
import { useClientAvatar } from '../../hooks/useClientAvatar';

type Props = {
  profileId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  /** Bubbles the success toast up to the page. */
  onDone: (message: string) => void;
};

/**
 * The "who you are" card: photo, display name and email.
 *
 * It owns the avatar upload because that write is self-contained — it neither
 * reads from nor blocks the details form beside it, so pairing the two would only
 * couple one busy state to the other and make a failed name save look like a
 * failed photo upload.
 */
export default function ProfileIdentityCard({ profileId, name, email, avatarUrl, onDone }: Props) {
  const { busy, error, displayUrl, upload, remove, maxSizeMb } = useClientAvatar(
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
      onSelect={upload}
      onRemove={remove}
    />
  );
}
