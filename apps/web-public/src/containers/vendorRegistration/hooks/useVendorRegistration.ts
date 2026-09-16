'use client';
import type { FormEvent } from 'react';
import { fieldId } from '../utils/fieldId';
import { useRegistrationFields } from './useRegistrationFields';
import { useRegistrationSubmit } from './useRegistrationSubmit';

/**
 * The vendor application: field state from `useRegistrationFields` and sending
 * from `useRegistrationSubmit`, joined at submit.
 */
export function useVendorRegistration() {
  const fields = useRegistrationFields();
  const { send, ...submission } = useRegistrationSubmit();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submission.submitting) return;

    const firstInvalid = fields.validate();
    if (firstInvalid) {
      // Everything is on one screen, so take the applicant to the first field
      // that needs them. Focusing an input also scrolls it into view.
      document.getElementById(fieldId(firstInvalid))?.focus();
      return;
    }
    await send(fields.values);
  }

  return {
    fields,
    ...submission,
    canSubmit: submission.captcha.solved && !submission.submitting,
    handleSubmit,
  };
}
