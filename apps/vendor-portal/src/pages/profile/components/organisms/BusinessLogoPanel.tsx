import { Box, Stack } from '@sinnapi/ui';
import { DocumentHeaderPreview, LogoUploadField, useBusinessLogo } from '@/components/businessLogo';

type Props = {
  vendorId: string;
  businessName: string;
  logoUrl: string | null;
  onboardingPhotoUrl: string | null;
  onDone: (message: string) => void;
};

/**
 * The business logo — `vendors.primary_image_url`, printed on every
 * quotation, invoice and receipt and shown on the listing. The preview
 * beneath shows it on a document exactly as a client will see it.
 */
export default function BusinessLogoPanel({
  vendorId,
  businessName,
  logoUrl,
  onboardingPhotoUrl,
  onDone,
}: Props) {
  const upload = useBusinessLogo({ vendorId, currentUrl: logoUrl, onboardingPhotoUrl, onDone });

  return (
    <Box sx={{ py: { xs: 1, sm: 2 }, maxWidth: 520, mx: 'auto' }}>
      <Stack spacing={3} alignItems="center">
        <LogoUploadField upload={upload} businessName={businessName} size={128} />
        <DocumentHeaderPreview
          businessName={businessName}
          logoUrl={upload.displayUrl}
          label="How it looks on your documents"
        />
      </Stack>
    </Box>
  );
}
