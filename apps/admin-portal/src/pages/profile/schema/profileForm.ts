import { z } from 'zod';
import type { ProfileModel } from '@/lib/types';

// Deliberately permissive: numbers, spaces and the usual grouping punctuation.
// Real validation of a dialable number belongs to a phone library, not a regex.
// (Kept in step with the Users page's rule so staff records validate the same
// way whether an admin edits them or the owner edits their own.)
const PHONE_RE = /^[+()\-\s\d]{6,20}$/;

const nameField = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} must be at least 2 characters.`)
    .max(80, `${label} must be 80 characters or fewer.`);

/**
 * The self-editable slice of a profile. Email is deliberately absent: it is the
 * account identity (it keys `auth.users`, sign-in and every notification), so
 * the page renders it read-only and no write ever carries it.
 */
export const profileFormSchema = z.object({
  first_name: nameField('First name'),
  middle_name: z.string().trim().max(80, 'Middle name must be 80 characters or fewer.'),
  last_name: nameField('Last name'),
  phone: z.union([z.literal(''), z.string().trim().regex(PHONE_RE, 'Enter a valid phone number.')]),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

/** "first middle last" with blanks dropped — the derived display name. */
export function composeFullName(v: ProfileFormValues): string {
  return [v.first_name, v.middle_name, v.last_name]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Best-effort split of a legacy `full_name` into parts.
 *
 * Self-registered accounts predate the first/middle/last columns and only carry
 * the composed name, so seeding the form from `full_name` is what keeps their
 * first save from wiping the display name down to a single token. First word →
 * first name, last word → last name, anything between → middle.
 */
function splitFullName(fullName: string | null): {
  first_name: string;
  middle_name: string;
  last_name: string;
} {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: '', middle_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], middle_name: '', last_name: '' };
  return {
    first_name: parts[0],
    middle_name: parts.slice(1, -1).join(' '),
    last_name: parts[parts.length - 1],
  };
}

/** Blank form — the shape react-hook-form starts from before the profile loads. */
export const emptyProfileValues: ProfileFormValues = {
  first_name: '',
  middle_name: '',
  last_name: '',
  phone: '',
};

/**
 * Project a profile row onto the form. The stored name parts win; `full_name` is
 * only mined when they're null (see `splitFullName`).
 */
export function toProfileFormValues(profile: ProfileModel | null | undefined): ProfileFormValues {
  if (!profile) return emptyProfileValues;
  const hasParts = Boolean(profile.first_name || profile.last_name);
  const parts = hasParts
    ? {
        first_name: profile.first_name ?? '',
        middle_name: profile.middle_name ?? '',
        last_name: profile.last_name ?? '',
      }
    : splitFullName(profile.full_name);
  return { ...parts, phone: profile.phone ?? '' };
}

/**
 * The `profiles` patch for a save. `full_name` is written alongside the parts so
 * the not-null display column never drifts from them — the same contract the
 * signup trigger and the create-staff function honour.
 */
export function toProfileUpdate(values: ProfileFormValues) {
  return {
    first_name: values.first_name.trim(),
    middle_name: values.middle_name.trim() || null,
    last_name: values.last_name.trim(),
    full_name: composeFullName(values),
    phone: values.phone.trim() || null,
  };
}
