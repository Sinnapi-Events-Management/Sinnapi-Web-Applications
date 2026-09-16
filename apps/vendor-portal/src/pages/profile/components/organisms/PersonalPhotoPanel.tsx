import { useVendorAvatar } from '../../hooks/useVendorAvatar';
import ProfileImageField from '../molecules/ProfileImageField';

type Props = {
  profileId: string;
  name: string;
  avatarUrl: string | null;
  onDone: (message: string) => void;
};

/** The vendor's own photo — `profiles.avatar_url`, the person, not the business. */
export default function PersonalPhotoPanel({ profileId, name, avatarUrl, onDone }: Props) {
  const upload = useVendorAvatar(profileId, avatarUrl, onDone);
  return <ProfileImageField upload={upload} name={name} shape="circle" subject="profile photo" />;
}
