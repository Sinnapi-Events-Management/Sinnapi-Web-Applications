import { z } from 'zod';

/**
 * Who a document is for — shared by the invoice editor and the receipt form.
 *
 *   client    a Sinnapi client the vendor already has a quote or booking with;
 *             their name is filled in and their email stays private
 *   external  anyone else, typed in or picked from Saved clients
 */
export const recipientShape = {
  recipient_mode: z.enum(['client', 'external']),
  client_id: z.string(),
  contact_id: z.string(),
  recipient_name: z.string().trim().max(200, 'Keep the name under 200 characters.'),
  recipient_company: z.string().trim().max(200, 'Keep the company under 200 characters.'),
  recipient_email: z
    .string()
    .trim()
    .max(254)
    .refine(
      (v) => v === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
      'Enter a valid email address.',
    ),
  recipient_phone: z.string().trim().max(40, 'Keep the phone under 40 characters.'),
  recipient_address: z.string().trim().max(500, 'Keep the address under 500 characters.'),
};

export type RecipientValues = {
  recipient_mode: 'client' | 'external';
  client_id: string;
  contact_id: string;
  recipient_name: string;
  recipient_company: string;
  recipient_email: string;
  recipient_phone: string;
  recipient_address: string;
};

export const emptyRecipient: RecipientValues = {
  recipient_mode: 'external',
  client_id: '',
  contact_id: '',
  recipient_name: '',
  recipient_company: '',
  recipient_email: '',
  recipient_phone: '',
  recipient_address: '',
};

/** The cross-field rule: a Sinnapi client must be chosen, or an external name typed. */
export function checkRecipient(v: RecipientValues, ctx: z.RefinementCtx) {
  if (v.recipient_mode === 'client' && !v.client_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['client_id'], message: 'Choose a client.' });
  }
  if (v.recipient_mode === 'external' && !v.contact_id && !v.recipient_name.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['recipient_name'],
      message: 'Add the client’s name.',
    });
  }
}

const blank = (s: string) => (s.trim() === '' ? null : s.trim());

/** The recipient part of an RPC payload. The server re-reads a registered client itself. */
export function recipientPayload(v: RecipientValues) {
  if (v.recipient_mode === 'client') {
    return { client_id: v.client_id || null, recipient_address: blank(v.recipient_address) };
  }
  return {
    contact_id: v.contact_id || null,
    recipient_name: blank(v.recipient_name),
    recipient_company: blank(v.recipient_company),
    recipient_email: blank(v.recipient_email),
    recipient_phone: blank(v.recipient_phone),
    recipient_address: blank(v.recipient_address),
  };
}
