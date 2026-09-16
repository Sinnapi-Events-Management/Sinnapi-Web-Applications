import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Divider, Stack, Typography } from '@sinnapi/ui';
import { ImagePicker } from '@sinnapi/ui/profile';
import CollectionsIcon from '@mui/icons-material/CollectionsOutlined';
import type { VendorOnboardingModel } from '../../hooks/useOnboardingStatus';
import { useOnboardingCover } from '../../hooks/useOnboardingCover';
import { useStepForm } from '../../hooks/useStepForm';
import { showcaseSchema, toShowcasePatch, toShowcaseValues } from '../../schema/showcaseForm';
import SocialLinksFields from '@/components/social/SocialLinksFields';
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
 * The optional finishing touches: a cover image, social profiles, and the way
 * through to the portfolio.
 *
 * Gallery images and videos are NOT uploaded here. They are rows in
 * `vendor_media` with plan limits, cover selection and soft deletes behind them,
 * all of which the portfolio page already owns — a second uploader would be a
 * second place for those rules to drift. The vendor is pointed at it instead.
 */
export default function ShowcaseStep({
  vendorId,
  vendor,
  isLast,
  onBack,
  onCancel,
  onDone,
}: Props) {
  const cover = useOnboardingCover(vendorId, vendor?.primary_image_url ?? null);
  const { control, submit, saving, error } = useStepForm(
    vendorId,
    showcaseSchema,
    vendor,
    toShowcaseValues,
    toShowcasePatch,
    onDone,
  );

  return (
    <Box component="form" noValidate onSubmit={submit}>
      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}
        {cover.error && <Alert severity="error">{cover.error}</Alert>}

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Cover image
          </Typography>
          <ImagePicker
            src={cover.displayUrl}
            name={vendor?.business_name ?? 'Your business'}
            busy={cover.busy}
            maxSizeMb={cover.maxSizeMb}
            shape="rounded"
            size={128}
            subject="cover image"
            helperText="A wide shot of your best work. Clients see this first on your listing card."
            onSelect={cover.upload}
            onRemove={cover.remove}
          />
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Social media (optional)
          </Typography>
          <SocialLinksFields control={control} disabled={saving} />
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Photos and videos
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Your gallery lives in the portfolio, where you can caption items, reorder them and pick
            which one leads.
          </Typography>
          <Button
            component={RouterLink}
            to="/portfolio"
            variant="outlined"
            startIcon={<CollectionsIcon />}
          >
            Open portfolio
          </Button>
        </Box>
      </Stack>

      <WizardFooter
        showBack
        optional
        saving={saving || cover.busy}
        isLast={isLast}
        onBack={onBack}
        onCancel={onCancel}
        onSkip={onDone}
      />
    </Box>
  );
}
