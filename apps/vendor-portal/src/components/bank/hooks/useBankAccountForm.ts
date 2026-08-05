import { useState } from 'react';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { bankAccountFormSchema, emptyBankAccountValues, toBankAccountArgs } from '../schema';

/**
 * Saves payout banking through `set_vendor_bank_account`, which encrypts the
 * account number server-side.
 *
 * The form is cleared on success rather than re-baselined: the raw number is
 * never read back (only its last 4 digits are shown elsewhere), so leaving it
 * on screen would be the one place in the app it lingers in plain text.
 */
export function useBankAccountForm(vendorId: string) {
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useZodForm(bankAccountFormSchema, { defaultValues: emptyBankAccountValues });

  const submit = handleSubmit(async (values) => {
    setError(null);
    const { error: rpcError } = await supabase.rpc(
      'set_vendor_bank_account',
      toBankAccountArgs(values, vendorId),
    );
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    reset(emptyBankAccountValues);
    setToast(true);
  });

  return {
    control,
    error,
    busy: isSubmitting,
    toast,
    dismissToast: () => setToast(false),
    submit,
  };
}
