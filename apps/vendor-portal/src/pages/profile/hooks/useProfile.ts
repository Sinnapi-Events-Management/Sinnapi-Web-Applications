import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { VendorProfileEditModel } from '@/lib/types';

/** Query key for the business record, so the logo write can invalidate it. */
export const vendorProfileKey = (vendorId: string) => ['v-profile', vendorId] as const;

const COLUMNS =
  'id,public_id,business_name,biography,base_city,business_location,website,starting_price,starting_price_currency,years_in_operation,pricing_model,lead_time,primary_image_url,profile_image_url,instagram_url,tiktok_url,linkedin_url,facebook_url,national_id_path,proof_of_work_path,business_reg_number,tax_id,icandy_alumni,slug,status,visibility,created_at';

/**
 * The vendor's own business record.
 *
 * Reads the listing facts (`slug`, `status`, `visibility`, `created_at`) alongside
 * the editable columns so the facts card beside the form costs no second round
 * trip. They are read-only here by design: visibility and status are owned by the
 * admin review flow, and the slug is what every public URL to this vendor is
 * already built from.
 *
 * The verification columns come along for the same reason, and are read-only for
 * a stronger one: the two `_path` values are private-bucket paths, so the card
 * that shows them reports only whether a document exists, never its contents.
 */
export function useProfile(vendorId: string) {
  return useQuery({
    queryKey: vendorProfileKey(vendorId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select(COLUMNS)
        .eq('id', vendorId)
        .maybeSingle();
      if (error) throw error;
      return (data as VendorProfileEditModel) ?? null;
    },
  });
}
