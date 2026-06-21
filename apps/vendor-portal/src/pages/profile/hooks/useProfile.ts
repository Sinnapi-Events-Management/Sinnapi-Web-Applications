import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { VendorProfileEditModel } from '@/lib/types';

export function useProfile(vendorId: string) {
  return useQuery({
    queryKey: ['v-profile', vendorId],
    queryFn: async () => {
      const { data } = await supabase
        .from('vendors')
        .select(
          'id,business_name,biography,base_city,website,starting_price,starting_price_currency',
        )
        .eq('id', vendorId)
        .maybeSingle();
      return (data as VendorProfileEditModel) ?? null;
    },
  });
}
