import type { NewsletterContact } from '@/lib/types';

/**
 * The rules a name-and-address pair has to satisfy, in one place.
 *
 * Three surfaces create contacts — the typed-entry form, the spreadsheet
 * importer, and a saved address book — and they used to disagree about what
 * counted as valid, which is how the same person ends up in the system twice
 * under `Ada@x.com` and `ada@x.com`. These functions are the single answer, and
 * they are deliberately pure so both the hooks and the RPC payload builder can
 * use them without either owning the definition.
 *
 * The server re-applies every one of them in `admin_contact_list_save` and
 * `admin_newsletter_queue`. Nothing here is a security boundary; it exists so
 * the operator is told about a bad row while they are still looking at it,
 * rather than by a count that comes back after they hit send.
 */

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Addresses are compared and stored lowercase — `Ada@x.com` is `ada@x.com`. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(normalizeEmail(value));
}

export function normalizeContact(input: {
  full_name?: string | null;
  email?: string | null;
}): NewsletterContact {
  return {
    // Collapse the runs of whitespace a spreadsheet cell arrives with, so
    // "Ada   Lovelace" and "Ada Lovelace" are one person.
    full_name: (input.full_name ?? '').replace(/\s+/g, ' ').trim(),
    email: normalizeEmail(input.email ?? ''),
  };
}

/**
 * Why a contact cannot be accepted, phrased for the operator, or null.
 *
 * The name is required, not merely welcomed: a nameless row in a saved address
 * book is one nobody can audit six months later, and a nameless recipient row
 * leaves the send record unable to say who was mailed beyond an address.
 */
export function contactIssue(contact: NewsletterContact): string | null {
  if (!contact.full_name) return 'Enter a name for this person.';
  if (!contact.email) return 'Enter an email address.';
  if (!EMAIL_RE.test(contact.email)) return `“${contact.email}” is not a valid email address.`;
  return null;
}

export function isCompleteContact(contact: NewsletterContact): boolean {
  return contactIssue(contact) === null;
}

/**
 * Merge contact lists, de-duplicating on the address.
 *
 * Later sources do not overwrite earlier ones: the typed entry an operator just
 * made is closer to the truth than the row in a spreadsheet they uploaded five
 * minutes ago, so the first occurrence wins and the argument order is the
 * precedence order.
 */
export function mergeContacts(...lists: NewsletterContact[][]): NewsletterContact[] {
  const byEmail = new Map<string, NewsletterContact>();
  for (const list of lists) {
    for (const contact of list) {
      if (!contact.email || byEmail.has(contact.email)) continue;
      byEmail.set(contact.email, contact);
    }
  }
  return Array.from(byEmail.values());
}

/** "Ada Lovelace <ada@x.com>" — the chip label and the confirmation copy. */
export function formatContact(contact: NewsletterContact): string {
  return contact.full_name ? `${contact.full_name} <${contact.email}>` : contact.email;
}

/**
 * Header aliases the importer accepts for each required column.
 *
 * Wide rather than strict on purpose: "Full Name", "NAME", "Contact name" and
 * "e-mail address" are all the same column to a human, and a file rejected for
 * calling it "E-mail" is a support conversation, not a validation win. What is
 * NOT flexible is the requirement that both columns exist — see
 * `useContactImport` for why that changed.
 */
export const NAME_HEADERS = [
  'name',
  'full name',
  'fullname',
  'full_name',
  'contact',
  'contact name',
  'contact_name',
  'recipient',
  'person',
];

export const FIRST_NAME_HEADERS = ['first name', 'firstname', 'first_name', 'given name'];
export const LAST_NAME_HEADERS = ['last name', 'lastname', 'last_name', 'surname', 'family name'];

export const EMAIL_HEADERS = [
  'email',
  'e-mail',
  'email address',
  'e-mail address',
  'email_address',
  'mail',
];

/** Header cells arrive with stray punctuation and casing; compare on the stem. */
export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[*:.]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Why a spreadsheet row produced no contact.
 *
 * Codes rather than sentences, because the same rejection is rendered three
 * ways — a chip in the preview table, a clause in the summary line, and a
 * colour — and three copies of the wording is how they drift apart.
 */
export const IMPORT_REJECTION_LABELS = {
  'no-email': 'No email address',
  'invalid-email': 'Not a valid email address',
  'no-name': 'No name',
} as const;

export type ImportRejectionReason = keyof typeof IMPORT_REJECTION_LABELS;
