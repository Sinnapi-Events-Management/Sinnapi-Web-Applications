'use client';
import { Box, Paper, Stack, Button, Alert, CircularProgress } from '@sinnapi/ui';
import { ArrowBack, ArrowForward, Send } from '@sinnapi/ui/icons';
import type { ReferenceOption } from '@/lib/queries';
import { useVendorRegistration } from '../../hooks/useVendorRegistration';
import RegistrationStepper from '../../molecules/RegistrationStepper';
import RegistrationSuccess from '../../molecules/RegistrationSuccess';
import StepBusinessOwner from '../../molecules/StepBusinessOwner';
import StepServicesPortfolio from '../../molecules/StepServicesPortfolio';
import StepVerificationPayout from '../../molecules/StepVerificationPayout';
import StepReferencesTerms from '../../molecules/StepReferencesTerms';

type Props = { categories: ReferenceOption[]; regions: ReferenceOption[] };

/** Interactive island: the whole multi-step vendor application. */
export default function RegistrationFormClient({ categories, regions }: Props) {
  const api = useVendorRegistration();
  const { step, stepCount, submitting, submitFailed, submitted, anyUploading, next, back, submit } =
    api;

  if (submitted) return <RegistrationSuccess />;

  const isLast = step === stepCount - 1;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 3 }}>
      <RegistrationStepper activeStep={step} />

      {submitFailed && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {anyUploading
            ? 'Please wait for your files to finish uploading, then submit again.'
            : 'Something went wrong submitting your application. Please review your details and try again.'}
        </Alert>
      )}

      <Box sx={{ minHeight: { md: 320 } }}>
        {step === 0 && <StepBusinessOwner api={api} categories={categories} />}
        {step === 1 && <StepServicesPortfolio api={api} regions={regions} />}
        {step === 2 && <StepVerificationPayout api={api} />}
        {step === 3 && <StepReferencesTerms api={api} />}
      </Box>

      <Stack
        direction="row"
        justifyContent="space-between"
        sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}
      >
        <Button
          variant="text"
          startIcon={<ArrowBack />}
          onClick={back}
          disabled={step === 0 || submitting}
          sx={{ visibility: step === 0 ? 'hidden' : 'visible' }}
        >
          Back
        </Button>

        {isLast ? (
          <Button
            variant="contained"
            size="large"
            endIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <Send />}
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit application'}
          </Button>
        ) : (
          <Button variant="contained" size="large" endIcon={<ArrowForward />} onClick={next}>
            Continue
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
