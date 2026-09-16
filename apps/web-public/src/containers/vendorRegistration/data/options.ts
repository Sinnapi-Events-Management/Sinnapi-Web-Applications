import type { ApplicantType, TermKey } from './schema';

// Human labels for the values the vendor application collects. Values map 1:1
// to the `vendor_application_intake` check constraints.

export type Option<V extends string = string> = { value: V; label: string };

export const APPLICANT_TYPES: Option<ApplicantType>[] = [
  { value: 'individual', label: 'Individual' },
  { value: 'registered_business', label: 'Registered business' },
];

// Term acceptances — keys match the form state / intake columns; each must be
// checked before the application can be submitted.
export const TERMS: { key: TermKey; label: string; href?: string }[] = [
  {
    key: 'acceptedInfoAccuracy',
    label: 'I confirm that all information provided is accurate and truthful.',
  },
  {
    key: 'acceptedVendorTerms',
    label: "I agree to Sinnapi's Vendor Terms of Service.",
    href: '/vendor-terms',
  },
  {
    key: 'acceptedEscrowPolicy',
    label: "I agree to Sinnapi's Payment & Escrow Policy.",
    href: '/escrow-policy',
  },
  {
    key: 'acceptedFalseInfoRemoval',
    label:
      'I understand that false information will result in immediate removal from the platform.',
  },
];

/**
 * The newsletter opt-in, kept apart from `TERMS` on purpose.
 *
 * GDPR Art.7(2) requires consent to be "clearly distinguishable from the other
 * matters" it is presented alongside — an opt-in bundled into a block of
 * acceptances somebody must tick to proceed is not freely given, and is not
 * valid consent. So this is a separate, optional, unticked box below a divider,
 * and the application submits perfectly well without it.
 *
 * The wording is sent to the server verbatim and stored on the subscription row
 * as the Art.7(1) record. Changing this string changes what future subscribers
 * agreed to — existing records keep the sentence they were actually shown.
 */
export const MARKETING_CONSENT_TEXT =
  'I would like to receive Sinnapi vendor updates, business tips and platform news by email.';

export const MARKETING_CONSENT_DESCRIPTION =
  'Occasional emails about growing your business on Sinnapi — new features, seasonal demand and tips from vendors who book well. No more than twice a month.';

/** What to tell the applicant when a submit does not go through. */
export type FailureReason = 'captcha' | 'generic';

export const SUBMIT_ERRORS: Record<FailureReason, string> = {
  captcha:
    "We couldn't confirm you're human. The check above has been reset — give it a moment, then submit again.",
  generic:
    'Something went wrong submitting your application. Please review your details and try again.',
};
