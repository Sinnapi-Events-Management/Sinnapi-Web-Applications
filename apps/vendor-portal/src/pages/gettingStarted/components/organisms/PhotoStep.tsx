import { Alert, Box, Stack } from '@sinnapi/ui';
import { ImagePicker } from '@sinnapi/ui/profile';
import type { VendorOnboardingModel } from '../../hooks/useOnboardingStatus';
import { useOnboardingPhoto } from '../../hooks/useOnboardingPhoto';
import WizardFooter from '../molecules/WizardFooter';

type Props = {
  vendorId: string;
  vendor: VendorOnboardingModel | null;
  isLast: boolean;
  onBack: () => void;
  /** Offered only to a vendor who is editing, not onboarding. */
  onCancel?: () => void;
  onDone: () => void;
};

/**
 * The required profile photo.
 *
 * The upload commits the moment a file is chosen rather than on Continue: an
 * image write is a storage object plus a column, and holding it until the end of
 * the step would mean a half-finished upload racing the vendor's next click.
 * Continue therefore only moves on, and stays disabled until an image exists.
 */
export default function PhotoStep({ vendorId, vendor, isLast, onBack, onCancel, onDone }: Props) {
  const photo = useOnboardingPhoto(vendorId, vendor?.profile_image_url ?? null);

  return (
    <Box
      component="form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onDone();
      }}
    >
      <Stack spacing={2} alignItems="flex-start">
        {photo.error && <Alert severity="error">{photo.error}</Alert>}

        <ImagePicker
          src={photo.displayUrl}
          name={vendor?.business_name ?? 'Your business'}
          busy={photo.busy}
          maxSizeMb={photo.maxSizeMb}
          shape="rounded"
          size={128}
          subject="profile photo"
          onSelect={photo.upload}
          onRemove={photo.remove}
        />

        {!photo.displayUrl && (
          <Alert severity="info" variant="outlined">
            A photo is required before your listing goes out to clients — a logo or a headshot both
            work.
          </Alert>
        )}
      </Stack>

      <WizardFooter
        showBack
        saving={photo.busy}
        isLast={isLast}
        onBack={onBack}
        onCancel={onCancel}
        onSkip={onDone}
        disabled={!photo.displayUrl}
      />
    </Box>
  );
}
