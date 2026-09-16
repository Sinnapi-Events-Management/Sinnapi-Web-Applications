import { useVendorLogo } from '../../hooks/useVendorLogo';
import ProfileImageField from '../molecules/ProfileImageField';

type Props = {
  vendorId: string;
  businessName: string;
  logoUrl: string | null;
  onDone: (message: string) => void;
};

/**
 * The listing image — `vendors.primary_image_url`. Rounded rather than circular,
 * the one cue separating it from the personal photo, which writes to a different
 * record through an otherwise identical control.
 */
export default function BusinessLogoPanel({ vendorId, businessName, logoUrl, onDone }: Props) {
  const upload = useVendorLogo(vendorId, logoUrl, onDone);
  return (
    <ProfileImageField
      upload={upload}
      name={businessName}
      shape="rounded"
      subject="business logo"
    />
  );
}
