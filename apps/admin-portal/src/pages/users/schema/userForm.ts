import { z } from 'zod';
import { PROFILE_STATUSES } from '@/lib/status';
import { one } from '@/lib/rel';
import type { RoleKeyRef, UserModel } from '@/lib/types';

export type SelectOption = { value: string; label: string };

export const STATUS_OPTIONS: SelectOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'suspended', label: 'Suspended' },
];

// Deliberately permissive: numbers, spaces and the usual grouping punctuation.
// Real validation of a dialable number belongs to a phone library, not a regex.
const PHONE_RE = /^[+()\-\s\d]{6,20}$/;

const nameField = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} must be at least 2 characters.`)
    .max(80, `${label} must be 80 characters or fewer.`);

/**
 * One schema drives both the create and edit drawers. `email` and `status` are
 * only *written* on create — the edit drawer shows email read-only and never
 * surfaces status (it's owned by the block/activate flow) — but keeping them in
 * a single shape lets one `UserForm` + one form hook serve both modes without
 * fighting react-hook-form's generics.
 */
export const userFormSchema = z.object({
  first_name: nameField('First name'),
  middle_name: z.string().trim().max(80, 'Middle name must be 80 characters or fewer.'),
  last_name: nameField('Last name'),
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
  phone: z.union([z.literal(''), z.string().trim().regex(PHONE_RE, 'Enter a valid phone number.')]),
  roleIds: z.array(z.string().uuid()).min(1, 'Assign at least one role.'),
  status: z.enum(PROFILE_STATUSES),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

/** "first middle last" with blanks dropped — the derived display name. */
export function composeFullName(v: {
  first_name: string;
  middle_name?: string;
  last_name: string;
}): string {
  return [v.first_name, v.middle_name, v.last_name]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(' ');
}

/** Flatten a user's nested `user_roles` into plain role refs. */
export function userRoles(u: UserModel): RoleKeyRef[] {
  const refs: RoleKeyRef[] = [];
  for (const ur of u.user_roles ?? []) {
    const role = one(ur.roles);
    if (role) refs.push(role);
  }
  return refs;
}

/** The role ids a user currently holds — seeds the edit form's multi-select. */
export function userRoleIds(u: UserModel): string[] {
  return userRoles(u).map((r) => r.id);
}

/** Blank create form — status defaults to active, the common case. */
export const emptyFormValues: UserFormValues = {
  first_name: '',
  middle_name: '',
  last_name: '',
  email: '',
  phone: '',
  roleIds: [],
  status: 'active',
};

/** Project a fetched user onto the form's all-strings shape (edit mode). */
export function toFormValues(u: UserModel): UserFormValues {
  return {
    first_name: u.first_name ?? '',
    middle_name: u.middle_name ?? '',
    last_name: u.last_name ?? '',
    email: u.email ?? '',
    phone: u.phone ?? '',
    roleIds: userRoleIds(u),
    status: (PROFILE_STATUSES as readonly string[]).includes(u.status)
      ? (u.status as UserFormValues['status'])
      : 'active',
  };
}

const nullIfEmpty = (s: string) => (s.trim() === '' ? null : s.trim());

/** Rebuild the editable profile columns from form values (edit mode). */
export function toProfileUpdate(values: UserFormValues) {
  return {
    first_name: values.first_name.trim(),
    middle_name: nullIfEmpty(values.middle_name),
    last_name: values.last_name.trim(),
    full_name: composeFullName(values),
    phone: nullIfEmpty(values.phone),
  };
}

/** Shape the create-staff Edge Function expects (create mode). */
export function toCreatePayload(values: UserFormValues) {
  return {
    firstName: values.first_name.trim(),
    middleName: nullIfEmpty(values.middle_name),
    lastName: values.last_name.trim(),
    email: values.email.trim().toLowerCase(),
    phone: nullIfEmpty(values.phone),
    roleIds: values.roleIds,
    status: values.status,
  };
}
