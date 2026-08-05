import { z } from 'zod';
import type { SelectOption } from '@sinnapi/ui/forms';
import { emailField, newPasswordField } from './password';

/** The account types a self-registering user may pick. */
export const SIGN_UP_ROLES = ['client', 'event_planner'] as const;
export type SignUpRole = (typeof SIGN_UP_ROLES)[number];

export const ROLE_OPTIONS: SelectOption[] = [
  { value: 'client', label: 'Client (planning my own event)' },
  { value: 'event_planner', label: 'Event Planner (managing events professionally)' },
];

export const signUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters.')
    .max(120, 'Full name must be 120 characters or fewer.'),
  email: emailField(),
  password: newPasswordField(),
  role: z.enum(SIGN_UP_ROLES, { errorMap: () => ({ message: 'Choose an account type.' }) }),
});

export type SignUpValues = z.infer<typeof signUpSchema>;

/** Blank form seeded with the role the marketing link asked for. */
export function emptySignUpValues(role: SignUpRole): SignUpValues {
  return { fullName: '', email: '', password: '', role };
}

/** Narrows an arbitrary `?role=` query param onto the allowed set. */
export function toSignUpRole(param: string | null): SignUpRole {
  return SIGN_UP_ROLES.includes(param as SignUpRole) ? (param as SignUpRole) : 'client';
}
