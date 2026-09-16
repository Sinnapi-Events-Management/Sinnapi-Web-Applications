'use client';
import { Paper, Stack } from '@sinnapi/ui/atoms';
import type { ReferenceOption } from '@/lib/queries';
import { SUBMIT_ERRORS } from '../../data/options';
import { useVendorRegistration } from '../../hooks/useVendorRegistration';
import RegistrationSuccess from '../../molecules/RegistrationSuccess';
import SubmitBar from '../../molecules/SubmitBar';
import BusinessSection from '../businessSection';
import OwnerSection from '../ownerSection';
import ConsentSection from '../consentSection';

type Props = { categories: ReferenceOption[] };

/** Interactive island: the one-step vendor application. */
export default function RegistrationFormClient({ categories }: Props) {
  const { fields, captcha, submitting, submitFailed, failure, submitted, canSubmit, handleSubmit } =
    useVendorRegistration();

  if (submitted) return <RegistrationSuccess />;

  return (
    <Paper
      component="form"
      noValidate
      onSubmit={handleSubmit}
      variant="outlined"
      sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 3, bgcolor: 'background.paper' }}
    >
      <Stack spacing={{ xs: 3, md: 4 }}>
        <BusinessSection fields={fields} categories={categories} disabled={submitting} />
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
