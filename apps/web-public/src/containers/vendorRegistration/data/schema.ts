import { z } from 'zod';

const PHONE_RE = /^[+\d][\d\s()-]{6,}$/;

/** A required acceptance: the box has to be ticked, not merely present. */
const accepted = z.literal(true, { errorMap: () => ({ message: 'Required' }) });

/**
 * The whole vendor application, in one step.
 *
 * Deliberately short: who the business is, who is applying, what they offer and
 * how to reach them. Bio, media and service regions are filled in from the
 * vendor portal after approval, and identity is checked by the review team
 * rather than by upload.
 *
 * Key order is the on-screen order. Zod reports issues in shape order, so the
 * first issue is the field nearest the top of the form — the one to focus.
 */
export const registrationSchema = z.object({
  businessName: z.string().trim().min(2, 'Enter your business or working name'),
  applicantType: z.enum(['individual', 'registered_business'], {
    errorMap: () => ({ message: 'Select who is applying' }),
  }),
  serviceCategoryKeys: z.array(z.string()).min(1, 'Select at least one service'),
  ownerFullName: z.string().trim().min(2, 'Enter the owner’s full name'),
  ownerEmail: z.string().trim().email('Enter a valid email'),
  ownerPhone: z.string().trim().regex(PHONE_RE, 'Enter a valid phone number'),
  acceptedInfoAccuracy: accepted,
  acceptedVendorTerms: accepted,
  acceptedEscrowPolicy: accepted,
  acceptedFalseInfoRemoval: accepted,
  // `boolean`, not `literal(true)`, and that is the whole point: the four above
  // are acceptances an applicant must give to proceed, this is a choice they
  // are free to decline. Validating it as required would make the consent
  // conditional on the application, which GDPR Art.7(4) does not allow.
  marketingConsent: z.boolean(),
});

export type TermKey =
  | 'acceptedInfoAccuracy'
  | 'acceptedVendorTerms'
  | 'acceptedEscrowPolicy'
  | 'acceptedFalseInfoRemoval';

/** Form state. Acceptances start unticked, so they are plain booleans until validated. */
export type RegistrationValues = Omit<z.infer<typeof registrationSchema>, TermKey> &
  Record<TermKey, boolean>;

export type FieldKey = keyof RegistrationValues;
export type FieldErrors = Partial<Record<FieldKey, string>>;
export type TextFieldKey = 'businessName' | 'ownerFullName' | 'ownerEmail' | 'ownerPhone';
export type ApplicantType = RegistrationValues['applicantType'];

export const INITIAL_VALUES: RegistrationValues = {
  businessName: '',
  applicantType: 'individual',
  serviceCategoryKeys: [],
  ownerFullName: '',
  ownerEmail: '',
  ownerPhone: '',
  acceptedInfoAccuracy: false,
  acceptedVendorTerms: false,
  acceptedEscrowPolicy: false,
  acceptedFalseInfoRemoval: false,
  // Unticked. A pre-ticked box is not consent under GDPR (Art.4(11) requires an
  // "unambiguous indication… by a statement or by a clear affirmative action"),
  // and Planet49 settled the point for pre-checked boxes specifically.
  marketingConsent: false,
};
