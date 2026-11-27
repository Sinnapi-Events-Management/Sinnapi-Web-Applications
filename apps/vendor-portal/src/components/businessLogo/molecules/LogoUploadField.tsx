import { Alert, Stack } from '@sinnapi/ui';
import { ImagePicker } from '@sinnapi/ui/profile';
import type { BusinessLogoUpload } from '../hooks/useBusinessLogo';
import { LOGO_COPY } from '../schema/copy';

type Props = {
  upload: BusinessLogoUpload;
  businessName: string;
  /** Tile height in px; the width follows (logos are usually wide). */
  size?: number;
};

/**
 * The logo picker with its failure directly beneath. One control for Profile,
 * the setup wizard and the logo-required dialog.
 */
export default function LogoUploadField({ upload, businessName, size = 120 }: Props) {
  return (
    <Stack spacing={2} alignItems="center" sx={{ width: '100%' }}>
      <ImagePicker
        src={upload.displayUrl}
        name={businessName}
        busy={upload.busy}
        maxSizeMb={upload.maxSizeMb}
        shape="logo"
        size={size}
        subject={LOGO_COPY.subject}
        helperText={`${LOGO_COPY.helper} Up to ${upload.maxSizeMb} MB.`}
        onSelect={upload.upload}
        onRemove={upload.remove}
      />
      {upload.error && (
        <Alert severity="error" sx={{ width: '100%' }} onClose={upload.clearError}>
          {upload.error}
        </Alert>
      )}
    </Stack>
  );
}
