import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { VendorProfileEditModel } from '@/lib/types';

/** Query key for the business record, so the logo write can invalidate it. */
export const vendorProfileKey = (vendorId: string) => ['v-profile', vendorId] as const;

/**
 * The vendor's own business record.
 *
 * Reads the listing facts (`slug`, `status`, `visibility`, `created_at`) alongside
 * the editable columns so the facts card beside the form costs no second round
 * trip. They are read-only here by design: visibility and status are owned by the
 * admin review flow, and the slug is what every public URL to this vendor is
 * already built from.
 */
export function useProfile(vendorId: string) {
  return useQuery({
    queryKey: vendorProfileKey(vendorId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select(
          'id,public_id,business_name,biography,base_city,website,starting_price,starting_price_currency,primary_image_url,slug,status,visibility,created_at',
        )
        .eq('id', vendorId)
        .maybeSingle();
      if (error) throw error;
      return (data as VendorProfileEditModel) ?? null;
    },
  });
}
