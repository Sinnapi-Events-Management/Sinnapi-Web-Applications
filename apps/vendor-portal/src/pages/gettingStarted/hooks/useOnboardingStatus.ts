import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useVendorBankAccount, useVendorCoverage } from '@/hooks/queries';
import { listingChecks, listingPercent } from '@/lib/listingCompleteness';
import { REQUIRED_STEPS, STEPS, type StepKey } from '../schema/steps';

/** The vendor columns onboarding reads back and writes. */
export type VendorOnboardingModel = {
  id: string;
  business_name: string | null;
  primary_category_id: string | null;
  base_city: string | null;
  business_location: string | null;
  years_in_operation: string | null;
  biography: string | null;
  pricing_model: string | null;
  starting_price: number | null;
  starting_price_currency: string | null;
  lead_time: string | null;
  website: string | null;
  profile_image_url: string | null;
  primary_image_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  linkedin_url: string | null;
  facebook_url: string | null;
  national_id_path: string | null;
  proof_of_work_path: string | null;
  business_reg_number: string | null;
  tax_id: string | null;
  icandy_alumni: boolean | null;
  onboarding_completed_at: string | null;
};

const COLUMNS =
  'id,business_name,primary_category_id,base_city,business_location,years_in_operation,biography,pricing_model,starting_price,starting_price_currency,lead_time,website,profile_image_url,primary_image_url,instagram_url,tiktok_url,linkedin_url,facebook_url,national_id_path,proof_of_work_path,business_reg_number,tax_id,icandy_alumni,onboarding_completed_at';

export const onboardingKey = (vendorId: string) => ['vendor-onboarding', vendorId];

/**
 * What the vendor still has to supply before their listing works.
 *
 * The rule per step is deliberately about REQUIRED fields only: a step whose
 * optional fields are blank still counts as done, so the progress meter tells
 * the truth about what is blocking the vendor rather than nagging about
 * everything they chose to skip.
 */
export function useOnboardingStatus(vendorId: string | undefined) {
  const vendorQuery = useQuery({
    queryKey: onboardingKey(vendorId ?? ''),
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select(COLUMNS)
        .eq('id', vendorId!)
        .single();
      if (error) throw error;
      return data as VendorOnboardingModel;
    },
  });

  const coverage = useVendorCoverage(vendorId);
  // The row itself, never the number: `vendor_bank_accounts` only ever hands the
  // client the last four digits, and onboarding needs nothing more than whether
  // a payout destination exists.
  const bank = useVendorBankAccount(vendorId);

  const vendor = vendorQuery.data ?? null;
  const regionCount = coverage.data?.length ?? 0;
  const hasSocial = !!(
    vendor?.instagram_url ||
    vendor?.tiktok_url ||
    vendor?.linkedin_url ||
    vendor?.facebook_url
  );

  const done: Record<StepKey, boolean> = {
    basics: !!vendor?.primary_category_id && !!vendor?.base_city,
    story: !!vendor?.biography && vendor?.starting_price != null,
    coverage: regionCount > 0,
    photo: !!vendor?.profile_image_url,
    verification: !!vendor?.national_id_path && !!bank.data,
    // Nothing here is required, so "done" only decides the tick and the meter.
    showcase: !!vendor?.primary_image_url || hasSocial,
  };

  // The meter shows the listing score the Profile page shows, not a count of
  // ticked steps — the ticks track required fields, the meter tracks polish.
  const checks = vendor ? listingChecks(vendor, regionCount) : [];

  return {
    vendor,
    done,
    hasBankAccount: !!bank.data,
    /** The first step still missing something, or null when everything is in. */
    firstIncomplete: STEPS.find((s) => !done[s.key])?.key ?? null,
    /**
     * Required steps only. The optional showcase must never stand between a
     * vendor and the rest of the portal — that is what makes it optional.
     */
    isComplete: REQUIRED_STEPS.every((s) => done[s.key]),
    /** The shared listing score — identical to the Profile header's. */
    percent: vendor ? listingPercent(checks) : 0,
    isLoading: vendorQuery.isLoading || coverage.isLoading || bank.isLoading,
    error: vendorQuery.error ?? coverage.error ?? bank.error,
  };
}
