'use client';
import { useState } from 'react';
import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().min(2, 'Please enter your name'),
  email: z.string().email('Enter a valid email'),
  message: z.string().min(10, 'Tell us a little more (10+ characters)'),
});

export function useContactForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = contactSchema.safeParse({
      name: form.get('name'),
      email: form.get('email'),
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
    // Lead capture would POST to a public Edge Function / contact endpoint.
    setSubmitted(true);
  }

  return { errors, submitted, handleSubmit };
}
