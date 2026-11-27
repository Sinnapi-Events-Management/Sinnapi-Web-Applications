import { z } from 'zod';
import type { ContactRow } from '@sinnapi/ui/documents';
import type { ContactInput } from '@/hooks/documentQueries';

export const contactFormSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, 'Add their name.')
    .max(200, 'Keep the name under 200 characters.'),
  company_name: z.string().trim().max(200, 'Keep the company under 200 characters.'),
  email: z
    .string()
    .trim()
    .max(254)
    .refine(
      (v) => v === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
      'Enter a valid email address.',
    ),
  phone: z.string().trim().max(40, 'Keep the phone under 40 characters.'),
  address: z.string().trim().max(500, 'Keep the address under 500 characters.'),
  notes: z.string().trim().max(1000, 'Keep notes under 1,000 characters.'),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export function contactValues(row: ContactRow | null): ContactFormValues {
  return {
    full_name: row?.full_name ?? '',
    company_name: row?.company_name ?? '',
    email: row?.email ?? '',
    phone: row?.phone ?? '',
    address: row?.address ?? '',
    notes: row?.notes ?? '',
  };
}

const blank = (s: string) => (s.trim() === '' ? null : s.trim());

export function contactInput(v: ContactFormValues): ContactInput {
  return {
    full_name: v.full_name.trim(),
    company_name: blank(v.company_name),
    email: blank(v.email)?.toLowerCase() ?? null,
    phone: blank(v.phone),
    address: blank(v.address),
    notes: blank(v.notes),
  };
}

/** A unique-email clash from the database, in words. */
export function contactErrorMessage(error: unknown): string | null {
  const text = JSON.stringify(error ?? '');
  if (text.includes('ux_vendor_contacts_email') || text.includes('23505')) {
    return 'You already saved a client with this email.';
  }
  return null;
}
