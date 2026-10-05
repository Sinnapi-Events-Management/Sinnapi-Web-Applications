import { Alert, Box, Divider, Grid, Stack, Typography } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import type { VendorOnboardingModel } from '../../hooks/useOnboardingStatus';
import { useStepForm } from '../../hooks/useStepForm';
import { useVerificationDocs } from '../../hooks/useVerificationDocs';
import {
  ALUMNI_OPTIONS,
  toVerificationPatch,
  toVerificationValues,
  verificationSchema,
} from '../../schema/verificationForm';
import VerificationDocsFields from '../molecules/VerificationDocsFields';
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
 * The id tying the footer's Continue to the particulars form below.
 *
 * Only the particulars are a form: the documents above it are storage uploads
 * that commit on their own, and the footer sits beneath both. Rather than
 * stretch the form element around uploads it does not submit, the button reaches
 * its form by `form={id}` from outside it.
 */
const PARTICULARS_FORM_ID = 'vendor-verification-particulars';

/**
 * Identity documents and business particulars.
 *
 * Two kinds of write share this step and each commits on its own: a document is
 * a storage object, and the particulars are plain columns. Only the latter
 * belongs to this step's form, which is what Continue submits.
 *
 * Nothing here is required. Verification is a trust signal reviewed on our own
 * schedule, not a precondition for a working listing, so the step never blocks
 * Continue and offers "Skip for now" — a vendor without a scan of their ID to
 * hand must still be able to reach the portal.
 */
export default function VerificationStep({
  vendorId,
  vendor,
  isLast,
  onBack,
  onCancel,
  onDone,
}: Props) {
  const docs = useVerificationDocs(vendorId, vendor);
  const { control, submit, saving, error } = useStepForm(
    vendorId,
    verificationSchema,
    vendor,
    toVerificationValues,
    toVerificationPatch,
    onDone,
  );

  return (
    <Box>
      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}

        <VerificationDocsFields
          items={docs.items}
          busy={docs.busy}
          error={docs.error}
          onSelect={docs.select}
          onRemove={docs.remove}
        />

        <Divider />

        <Box component="form" id={PARTICULARS_FORM_ID} noValidate onSubmit={submit}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Business particulars (optional)
          </Typography>
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}>
              <ControlledField
                name="business_reg_number"
                control={control}
                label="Business registration number"
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <ControlledField
                name="tax_id"
                control={control}
                label="Tax Identification Number"
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <ControlledField
                name="icandy_alumni"
                control={control}
                label="iCandy Masterclass alumni?"
                options={ALUMNI_OPTIONS}
                disabled={saving}
              />
            </Grid>
          </Grid>
        </Box>
      </Stack>

      <WizardFooter
        showBack
        optional
        formId={PARTICULARS_FORM_ID}
        saving={saving || docs.busy}
        isLast={isLast}
        onBack={onBack}
        onCancel={onCancel}
        onSkip={onDone}
      />
    </Box>
  );
}
