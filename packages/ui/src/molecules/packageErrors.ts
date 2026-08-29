/**
 * What a failed package write means, in words the person who tried it can act
 * on.
 *
 * The same table serves the vendor portal and the console because the RPCs
 * raise the same tokens at both — `package_withheld_by_admin` is read by a
 * vendor wondering why their toggle did nothing and by a moderator confirming
 * their take-down held. Copy that had to say the same thing twice would end up
 * saying it two ways.
 *
 * The reading itself is delegated to `rpcErrorMessage` for the reason spelled
 * out there: a Supabase RPC error is a plain object, not an `Error`, and the
 * naive ternary renders `[object Object]`.
 */
import { rpcErrorMessage } from './rpcError';

export const PACKAGE_ERRORS: Record<string, string> = {
  package_name_required: 'Give this package a name before saving it.',
  package_needs_a_tier: 'A package needs at least one tier.',
  tier_name_required: 'Every tier needs a name.',
  // Carries the offending tier's name after the colon; `rpcErrorMessage`
  // matches on the token, so the interpolated value does not break the lookup.
  tier_needs_a_line: 'Every tier needs at least one priced line.',
  tier_not_found: 'One of these tiers no longer exists — reload and try again.',
  tier_not_in_package: 'That tier does not belong to this package.',
  package_not_ready:
    'Add at least one priced line before publishing — an empty package on your profile costs you ' +
    'more than no package at all.',
  package_withheld_by_admin:
    'A moderator has taken this package down, so it cannot be published from here. Check the ' +
    'reason on the package, fix what it names, then contact support to have it restored.',
  package_not_found: 'That package no longer exists.',
  package_unavailable: 'That package is not available from this vendor.',
  package_pricing_model_required:
    'Choose how this package is charged — fixed, hourly, base fee plus variable, or custom quote. ' +
    'It is the first thing a client looks for.',
  // Carries the offending model after the colon; `rpcErrorMessage` matches on
  // the token, so the interpolated value does not break the lookup.
  pricing_model_not_offered:
    'The service this package sits under does not offer that way of charging. Either pick a ' +
    'different one here, or add it to the service first.',
  service_not_found: 'That service no longer exists, or it is not yours.',
  tax_rate_out_of_range: 'Tax must be between 0% and 100%.',
  discount_rate_out_of_range: 'A discount must be between 0% and 100%.',
  advance_rate_out_of_range: 'That advance is above the platform ceiling.',
  advance_release_days_out_of_range: 'That advance timing is outside the platform limit.',
  reason_required: 'A reason is required — the vendor will be told what it says.',
  not_found: 'This package no longer exists.',
  forbidden: 'You do not have permission to change this package.',
};

/** Whatever a package RPC failed with, as a sentence. */
export function packageActionError(error: unknown): string {
  return rpcErrorMessage(error, PACKAGE_ERRORS);
}
