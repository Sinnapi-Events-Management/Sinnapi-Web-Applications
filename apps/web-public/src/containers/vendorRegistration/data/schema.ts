import { z } from 'zod';

const PHONE_RE = /^[+\d][\d\s()-]{6,}$/;

/** A required acceptance: the box has to be ticked, not merely present. */
const accepted = z.literal(true, { errorMap: () => ({ message: 'Required' }) });
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const allowedDocumentTypes = new Set(['application/pdf', 'image/png', 'image/jpeg']);
const allowedDocumentExtensions = /\.(pdf|png|jpe?g)$/i;
const applicationDocument = z.custom<File>(
  (value) =>
    typeof File !== 'undefined' &&
    value instanceof File &&
    value.size <= MAX_DOCUMENT_SIZE &&
    allowedDocumentExtensions.test(value.name) &&
    (!value.type || allowedDocumentTypes.has(value.type)),
  'Choose a PDF, PNG or JPG/JPEG file up to 10 MB',
);

/**
 * The whole vendor application, in one step.
 *
 * Deliberately short: who the business is, who is applying, what they offer and
 * how to reach them. Bio, media and service regions are filled in from the
 * vendor portal after approval. A National ID is required for review, and
 * registered businesses also provide their certificate of incorporation.
 *
 * Key order is the on-screen order. Zod reports issues in shape order, so the
 * first issue is the field nearest the top of the form — the one to focus.
 */
export const registrationSchema = z
  .object({
    businessName: z.string().trim().min(2, 'Enter your business or working name'),
    applicantType: z.enum(['individual', 'registered_business'], {
      errorMap: () => ({ message: 'Select who is applying' }),
    }),
    serviceCategoryKeys: z.array(z.string()).min(1, 'Select at least one service'),
    ownerFullName: z.string().trim().min(2, 'Enter the owner’s full name'),
    ownerEmail: z.string().trim().email('Enter a valid email'),
    ownerPhone: z.string().trim().regex(PHONE_RE, 'Enter a valid phone number'),
    nationalIdFile: applicationDocument.nullable(),
    businessRegistrationFile: applicationDocument.nullable(),
    acceptedInfoAccuracy: accepted,
    acceptedVendorTerms: accepted,
    acceptedEscrowPolicy: accepted,
    acceptedFalseInfoRemoval: accepted,
    // `boolean`, not `literal(true)`, and that is the whole point: the four above
    // are acceptances an applicant must give to proceed, this is a choice they
    // are free to decline. Validating it as required would make the consent
    // conditional on the application, which GDPR Art.7(4) does not allow.
    marketingConsent: z.boolean(),
  })
  .superRefine((values, context) => {
    if (!values.nationalIdFile) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nationalIdFile'],
        message: 'Upload your National ID',
      });
    }
    if (values.applicantType === 'registered_business' && !values.businessRegistrationFile) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['businessRegistrationFile'],
        message: 'Upload your certificate of incorporation',
      });
    }
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
  nationalIdFile: null,
  businessRegistrationFile: null,
  acceptedInfoAccuracy: false,
  acceptedVendorTerms: false,
  acceptedEscrowPolicy: false,
  acceptedFalseInfoRemoval: false,
  // Unticked. A pre-ticked box is not consent under GDPR (Art.4(11) requires an
  // "unambiguous indication… by a statement or by a clear affirmative action"),
  // and Planet49 settled the point for pre-checked boxes specifically.
  marketingConsent: false,
};
