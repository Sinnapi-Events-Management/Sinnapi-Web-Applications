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
  /** Records that the photo was skipped because the upload failed, not by choice. */
  onDeferPhoto: () => void;
  /** True once this sitting has already been let past a failed upload. */
  deferred: boolean;
};

/**
 * The required profile photo.
 *
 * The upload commits the moment a file is chosen rather than on Continue: an
 * image write is a storage object plus a column, and holding it until the end of
 * the step would mean a half-finished upload racing the vendor's next click.
 * Continue therefore only moves on, and stays disabled until an image exists.
 *
 * Unless the upload itself has failed. A required step whose only exit is an
 * upload is a step that a storage fault turns into a locked account — the modal
 * cannot be dismissed and `OnboardingGate` redirects everything else back to it,
 * so the vendor's sole remaining option is to sign out. Once an attempt has come
 * back refused, Continue therefore opens: the photo is still required and still
 * chased on the Profile checklist, but no vendor is held hostage by a bucket.
 * The block stands while no attempt has been made, so this is not a quiet way
 * out of the requirement.
 */
export default function PhotoStep({
  vendorId,
  vendor,
  isLast,
  onBack,
  onCancel,
  onDone,
  onDeferPhoto,
  deferred,
}: Props) {
  const photo = useOnboardingPhoto(vendorId, vendor?.profile_image_url ?? null);

  // An attempt was made and refused, and nothing is stored: the only state in
  // which continuing without a photo is offered.
  const uploadFailed = !!photo.error && !photo.displayUrl;

  // `photo.error` is component state, so stepping Back to this step clears it
  // and would shut the door on a vendor who had already been let through —
  // stranding them here until they provoked the same failure a second time.
  // `deferred` is the wizard's memory that it was opened, so it stays open.
  const mayContinueWithout = uploadFailed || (deferred && !photo.displayUrl);

  return (
    <Box
      component="form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!photo.displayUrl) onDeferPhoto();
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

        {!photo.displayUrl && !mayContinueWithout && (
          <Alert severity="info" variant="outlined">
            A photo is required before your listing goes out to clients — a logo or a headshot both
            work.
          </Alert>
        )}

        {mayContinueWithout && (
          <Alert severity="warning" variant="outlined">
            You can continue without it for now — we will keep asking for a photo on your profile,
            and your listing stays off client search until one is in.
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
        disabled={!photo.displayUrl && !mayContinueWithout}
      />
    </Box>
  );
}
