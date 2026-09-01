import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { BANK_ACCOUNT_KEY, useVendorBankAccount } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';
import { bankAccountFormSchema, emptyBankAccountValues, toBankAccountArgs } from '../schema';

/**
 * Saves payout banking through `set_vendor_bank_account`, which encrypts the
 * account number server-side.
 *
 * The form is cleared on success rather than re-baselined: the raw number is
 * never read back (only its last 4 digits are shown elsewhere), so leaving it
 * on screen would be the one place in the app it lingers in plain text.
 *
 * `current` is that "elsewhere", now brought here. Clearing the form and showing
 * nothing else left a vendor with four empty boxes and no way to tell whether an
 * account was on file at all — so the masked row above the form is what the empty
 * form no longer says. It is read separately from the write and invalidated after
 * one, because the RPC returns only the new row's id.
 */
export function useBankAccountForm(vendorId: string) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const { data: current, isLoading: loadingCurrent } = useVendorBankAccount(vendorId);

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
    await qc.invalidateQueries({ queryKey: [BANK_ACCOUNT_KEY, vendorId] });
    setToast(true);
  });

  return {
    control,
    current: current ?? null,
    loadingCurrent,
    error,
    busy: isSubmitting,
    toast,
    dismissToast: () => setToast(false),
    submit,
  };
}
