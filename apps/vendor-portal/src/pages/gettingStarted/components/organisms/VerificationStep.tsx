import { Alert, Box, Divider, Grid, Stack, Typography } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import BankAccountForm from '@/components/bank/BankAccountForm';
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
  hasBankAccount: boolean;
  isLast: boolean;
  onBack: () => void;
  /** Offered only to a vendor who is editing, not onboarding. */
  onCancel?: () => void;
  onDone: () => void;
};

/**
 * The id tying the footer's Continue to the particulars form below.
 *
 * This step contains a SECOND form — `BankAccountForm`, which posts to an
 * encrypting RPC of its own — and HTML has no nested forms: a browser given one
 * drops the inner element, after which its submit button silently submits the
 * outer form instead. So nothing here wraps the whole step; the particulars keep
 * their own form, the bank form stays a sibling, and the footer's button reaches
 * its form by `form={id}` rather than by being inside it.
 */
const PARTICULARS_FORM_ID = 'vendor-verification-particulars';

/**
 * Identity, business particulars and payout details.
 *
 * Three different kinds of write share this step, and each commits on its own: a
 * document is a storage object, a bank account goes through an encrypting RPC
 * that never reads the number back, and the particulars are plain columns. Only
 * the last belongs to this step's form — Continue saves those, and is blocked
 * until the two REQUIRED pieces (an ID on file, a payout destination) exist.
 */
export default function VerificationStep({
  vendorId,
  vendor,
  hasBankAccount,
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

  const hasId = !!vendor?.national_id_path;

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

        <Divider />

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Payout details
          </Typography>
          {/* The same form the payouts page uses, and a sibling of the form above
              rather than a child of it. It owns its own Save because the RPC
              behind it encrypts the account number — folding it into this step's
              submit would mean holding that number in form state until the vendor
              finished the rest of the screen. */}
          <BankAccountForm vendorId={vendorId} />
        </Box>

        {(!hasId || !hasBankAccount) && (
          <Alert severity="info" variant="outlined">
            {!hasId && !hasBankAccount
              ? 'Upload your National ID and save your bank details to finish.'
              : !hasId
                ? 'Upload your National ID to finish.'
                : 'Save your bank details to finish.'}
          </Alert>
        )}
      </Stack>

      <WizardFooter
        showBack
        formId={PARTICULARS_FORM_ID}
        saving={saving || docs.busy}
        isLast={isLast}
        disabled={!hasId || !hasBankAccount}
        onBack={onBack}
        onCancel={onCancel}
        onSkip={onDone}
      />
    </Box>
  );
}
