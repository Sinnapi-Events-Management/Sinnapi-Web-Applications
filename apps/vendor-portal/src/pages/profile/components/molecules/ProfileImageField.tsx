import { Alert, Box } from '@sinnapi/ui';
import { ImagePicker } from '@sinnapi/ui/profile';

type Props = {
  /** Straight from `useProfileImageUpload` (via `useVendorLogo` / `useVendorAvatar`). */
  upload: {
    busy: boolean;
    error: string | null;
    displayUrl: string | null;
    upload: (file: File) => void;
    remove: () => void;
    maxSizeMb: number;
  };
  name: string;
  shape: 'circle' | 'rounded';
  subject: string;
};

/**
 * The picker a Logo or Photo panel is made of, with its failure directly beneath.
 * Centred with room to breathe — it's the only control on its panel.
 */
export default function ProfileImageField({ upload, name, shape, subject }: Props) {
  return (
    <Box sx={{ py: { xs: 1, sm: 2 }, maxWidth: 420, mx: 'auto' }}>
      <ImagePicker
        src={upload.displayUrl}
        name={name}
        busy={upload.busy}
        maxSizeMb={upload.maxSizeMb}
        shape={shape}
        size={144}
        subject={subject}
        helperText={`Drag an image here, or browse. JPG, PNG, WebP or AVIF up to ${upload.maxSizeMb} MB — square images work best.`}
        onSelect={upload.upload}
        onRemove={upload.remove}
      />
      {upload.error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {upload.error}
        </Alert>
      )}
    </Box>
  );
}
