'use client';
import { Paper, Stack } from '@sinnapi/ui/atoms';
import type { ReferenceOption } from '@/lib/queries';
import { SUBMIT_ERRORS } from '../../data/options';
import { useVendorRegistration } from '../../hooks/useVendorRegistration';
import ApplicationsPaused from '../../molecules/ApplicationsPaused';
import RegistrationSuccess from '../../molecules/RegistrationSuccess';
import SubmitBar from '../../molecules/SubmitBar';
import BusinessSection from '../businessSection';
import OwnerSection from '../ownerSection';
import ConsentSection from '../consentSection';
import VerificationDocumentsSection from '../verificationDocumentsSection';

type Props = { categories: ReferenceOption[]; categoriesFailed: boolean };

/** Interactive island: the one-step vendor application. */
export default function RegistrationFormClient({ categories, categoriesFailed }: Props) {
  const { fields, captcha, submitting, submitFailed, failure, submitted, canSubmit, handleSubmit } =
    useVendorRegistration();

  if (submitted) return <RegistrationSuccess />;
  // Loaded fine but nothing is active: no application could pass validation.
  // A failed load is different — that keeps the form and offers a retry.
  if (!categoriesFailed && categories.length === 0) return <ApplicationsPaused />;

  return (
    <Paper
      component="form"
      noValidate
      onSubmit={handleSubmit}
      variant="outlined"
      sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 3, bgcolor: 'background.paper' }}
    >
      <Stack spacing={{ xs: 3, md: 4 }}>
        <BusinessSection
          fields={fields}
          categories={categories}
          categoriesFailed={categoriesFailed}
          disabled={submitting}
        />
        <VerificationDocumentsSection fields={fields} disabled={submitting} />
        <OwnerSection fields={fields} disabled={submitting} />
        <ConsentSection fields={fields} captcha={captcha} disabled={submitting} />
      </Stack>
      <SubmitBar
        submitting={submitting}
        canSubmit={canSubmit}
        errorMessage={submitFailed ? SUBMIT_ERRORS[failure] : undefined}
      />
    </Paper>
  );
}
