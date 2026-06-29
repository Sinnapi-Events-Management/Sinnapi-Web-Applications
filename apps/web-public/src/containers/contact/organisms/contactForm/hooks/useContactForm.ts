'use client';
import { useState } from 'react';
import { z } from 'zod';
import { INQUIRY_TYPES } from '../data/inquiryTypes';

export const contactSchema = z.object({
  name: z.string().min(2, 'Please enter your name'),
  email: z.string().email('Enter a valid email'),
  // Optional, but if supplied must look like a phone number.
  phone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[+\d][\d\s()-]{6,}$/.test(v), 'Enter a valid phone number')
    .optional(),
  inquiryType: z.enum(INQUIRY_TYPES, { errorMap: () => ({ message: 'Choose a topic' }) }),
  message: z.string().min(10, 'Tell us a little more (10+ characters)'),
});

export type ContactValues = z.infer<typeof contactSchema>;

type Status = 'idle' | 'submitting' | 'error';

/** Mock network call. Swap for a POST to the public contact Edge Function. */
function submitLead(_values: ContactValues): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 900));
}

export function useContactForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = contactSchema.safeParse({
      name: form.get('name'),
      email: form.get('email'),
      phone: form.get('phone') ?? '',
      inquiryType: form.get('inquiryType'),
      message: form.get('message'),
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        fieldErrors[i.path[0] as string] = i.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setStatus('submitting');
    try {
      await submitLead(parsed.data);
      setSubmitted(true);
    } catch {
      setStatus('error');
    }
  }

  return {
    errors,
    submitted,
    submitting: status === 'submitting',
    submitFailed: status === 'error',
    handleSubmit,
  };
}
