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
  // Required, and `literal(true)` is what enforces it: an account cannot be
  // created without accepting the terms, and the acceptance is an affirmative
  // act rather than something buried in fine print under the button.
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'Please accept the Terms of Service and Privacy Policy.' }),
  }),
  // Optional, and deliberately a plain boolean. Making this required would tie
  // consent to getting an account, which GDPR Art.7(4) does not allow — consent
  // conditional on a service the consent is not necessary for is not freely
  // given, and so is not consent at all.
  marketingConsent: z.boolean(),
});

/**
 * The exact sentence shown beside the newsletter checkbox.
 *
 * Sent to the server with the opt-in and stored verbatim on the subscription
 * row as the GDPR Art.7(1) record. Editing this string changes what FUTURE
 * subscribers agreed to; existing records keep the wording they were shown.
 */
export const MARKETING_CONSENT_TEXT =
  'I would like to receive Sinnapi newsletters, planning tips and occasional offers by email.';

export type SignUpValues = z.infer<typeof signUpSchema>;

/** Blank form seeded with the role the marketing link asked for. */
export function emptySignUpValues(role: SignUpRole): SignUpValues {
  return {
    fullName: '',
    email: '',
    password: '',
    role,
    // `false` for both, and the terms box is typed `literal(true)` — so this
    // seed does not satisfy the schema, which is exactly right: the form must
    // not be submittable until the person has actually ticked it. A pre-ticked
    // consent box is not consent under GDPR Art.4(11).
    acceptedTerms: false as unknown as true,
    marketingConsent: false,
  };
}

/** Narrows an arbitrary `?role=` query param onto the allowed set. */
export function toSignUpRole(param: string | null): SignUpRole {
  return SIGN_UP_ROLES.includes(param as SignUpRole) ? (param as SignUpRole) : 'client';
}
