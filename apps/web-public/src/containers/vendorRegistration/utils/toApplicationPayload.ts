import type { RegistrationValues } from '../data/schema';
import { MARKETING_CONSENT_TEXT } from '../data/options';

/**
 * The body the `vendor-application` Edge Function expects — only the fields the
 * one-step form collects. The function treats every other intake field as
 * optional.
 */
export function toApplicationPayload(
  values: RegistrationValues,
  captchaToken: string,
  submissionRef: string,
) {
  return {
    captchaToken,
    submissionRef,
    businessName: values.businessName,
    applicantType: values.applicantType,
    serviceCategoryKeys: values.serviceCategoryKeys,
    ownerFullName: values.ownerFullName,
    ownerEmail: values.ownerEmail,
    ownerPhone: values.ownerPhone,
    acceptedInfoAccuracy: values.acceptedInfoAccuracy,
    acceptedVendorTerms: values.acceptedVendorTerms,
    acceptedEscrowPolicy: values.acceptedEscrowPolicy,
    acceptedFalseInfoRemoval: values.acceptedFalseInfoRemoval,
    marketingConsent: values.marketingConsent,
    // The wording is sent with the answer, not looked up server-side: the
    // record has to say what THIS applicant was shown, and this page's copy
    // will be rewritten long before the consent record expires.
    marketingConsentText: MARKETING_CONSENT_TEXT,
  };
}
