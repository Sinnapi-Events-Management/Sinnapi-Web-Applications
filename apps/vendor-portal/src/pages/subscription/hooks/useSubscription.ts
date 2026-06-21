import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useVendorContext } from '@/vendor/VendorProvider';
import { usePlans } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';

export function useSubscription(vendorId: string) {
  const qc = useQueryClient();
  const { subscription } = useVendorContext();
  const plans = usePlans();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(planId: string) {
    setBusy(planId);
    setError(null);
    const { error } = await supabase.rpc('choose_subscription_plan', {
      p_vendor_id: vendorId,
      p_plan_id: planId,
    });
    setBusy(null);
    if (error) {
      setError(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['my-subscription'] });
  }

  return { subscription, plans, busy, error, choose };
}
