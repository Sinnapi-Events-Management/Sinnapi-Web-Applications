import type { RegistrationValues } from '../data/schema';
import { MARKETING_CONSENT_TEXT } from '../data/options';
import type { IntakeDocumentPaths } from './applicationDocuments';

/**
 * The body the `vendor-application` Edge Function expects — only the fields the
 * one-step form collects. The function treats every other intake field as
 * optional.
 */
export function toApplicationPayload(
  values: RegistrationValues,
  captchaToken: string,
  submissionRef: string,
  documentPaths: IntakeDocumentPaths,
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
    // Keyed by storage folder on the way in, by column name on the way out:
    // these two names are what the endpoint reads, and an absent document is
    // sent as null rather than omitted so the two sides stay in step.
    nationalIdPath: documentPaths['national-id'] ?? null,
    businessRegistrationDocumentPath: documentPaths['business-registration'] ?? null,
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
