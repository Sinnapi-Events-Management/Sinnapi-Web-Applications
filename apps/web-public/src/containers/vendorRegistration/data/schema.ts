import { z } from 'zod';

const PHONE_RE = /^[+\d][\d\s()-]{6,}$/;

const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === '' || /^https?:\/\/.+/i.test(v), 'Enter a full URL (https://…)')
  .optional();

const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === '' || PHONE_RE.test(v), 'Enter a valid phone number')
  .optional();

/** A single client reference (all fields optional; validated if provided). */
export const refereeSchema = z.object({
  fullName: z.string().trim().optional(),
  phone: optionalPhone,
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Enter a valid email')
    .optional(),
  eventWorkedOn: z.string().trim().optional(),
  eventDate: z.string().trim().optional(),
});
export type Referee = z.infer<typeof refereeSchema>;

// --- Step 1: Business & owner ---
export const step1Schema = z.object({
  businessName: z.string().trim().min(2, 'Enter your business or working name'),
  applicantType: z.enum(['individual', 'registered_business'], {
    errorMap: () => ({ message: 'Select who is applying' }),
  }),
  primaryCategoryKey: z.string().min(1, 'Choose your primary category'),
  serviceCategoryKeys: z.array(z.string()).min(1, 'Select at least one service'),
  biography: z.string().trim().min(20, 'Tell clients a little more (20+ characters)'),
  yearsInOperation: z.enum(['lt_1y', '1_3y', '3_5y', '5_10y', '10y_plus'], {
    errorMap: () => ({ message: 'Select how long you have operated' }),
  }),
  baseCity: z.string().trim().min(2, 'Enter your base city'),
  businessLocation: z.string().trim().optional(),
  website: optionalUrl,
  ownerFullName: z.string().trim().min(2, 'Enter the owner’s full name'),
  ownerEmail: z.string().trim().email('Enter a valid email'),
  ownerPhone: z.string().trim().regex(PHONE_RE, 'Enter a valid phone number'),
});

// --- Step 2: Services, pricing & portfolio (files validated in the hook) ---
export const step2Schema = z.object({
  pricingModel: z.enum(['fixed', 'hourly', 'custom', 'combination']).or(z.literal('')).optional(),
  startingPrice: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0),
      'Enter a valid amount',
    )
    .optional(),
  leadTime: z
    .enum(['same_week', '1_2_weeks', '2_4_weeks', '1_3_months', '3_plus_months'])
    .or(z.literal(''))
    .optional(),
  serviceRegionKeys: z.array(z.string()).min(1, 'Select at least one service region'),
  instagramUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  facebookUrl: optionalUrl,
});

// --- Step 3: Verification & payout (National ID file validated in the hook) ---
export const step3Schema = z.object({
  businessRegNumber: z.string().trim().optional(),
  taxId: z.string().trim().optional(),
  icandyAlumni: z.enum(['yes', 'no']).or(z.literal('')).optional(),
  bankName: z.string().trim().min(2, 'Enter your bank name'),
  accountName: z.string().trim().min(2, 'Enter the account name'),
  accountNumber: z.string().trim().min(4, 'Enter the account number'),
  branch: z.string().trim().optional(),
});

// --- Step 4: References & terms ---
export const step4Schema = z.object({
  referees: z.array(refereeSchema).optional(),
  acceptedInfoAccuracy: z.literal(true, { errorMap: () => ({ message: 'Required' }) }),
  acceptedVendorTerms: z.literal(true, { errorMap: () => ({ message: 'Required' }) }),
  acceptedEscrowPolicy: z.literal(true, { errorMap: () => ({ message: 'Required' }) }),
  acceptedFalseInfoRemoval: z.literal(true, { errorMap: () => ({ message: 'Required' }) }),
});

export const STEP_SCHEMAS = [step1Schema, step2Schema, step3Schema, step4Schema] as const;

export type RegistrationValues = z.infer<typeof step1Schema> &
  z.infer<typeof step2Schema> &
  z.infer<typeof step3Schema> & {
    referees: Referee[];
    acceptedInfoAccuracy: boolean;
    acceptedVendorTerms: boolean;
    acceptedEscrowPolicy: boolean;
    acceptedFalseInfoRemoval: boolean;
  };

export const INITIAL_VALUES: RegistrationValues = {
  businessName: '',
  applicantType: 'individual',
  primaryCategoryKey: '',
  serviceCategoryKeys: [],
  biography: '',
  yearsInOperation: 'lt_1y',
  baseCity: '',
  businessLocation: '',
  website: '',
  ownerFullName: '',
  ownerEmail: '',
  ownerPhone: '',
  pricingModel: '',
  startingPrice: '',
  leadTime: '',
  serviceRegionKeys: [],
  instagramUrl: '',
  tiktokUrl: '',
  linkedinUrl: '',
  facebookUrl: '',
  businessRegNumber: '',
  taxId: '',
  icandyAlumni: '',
  bankName: '',
  accountName: '',
  accountNumber: '',
  branch: '',
  referees: [],
  acceptedInfoAccuracy: false,
  acceptedVendorTerms: false,
  acceptedEscrowPolicy: false,
  acceptedFalseInfoRemoval: false,
};
