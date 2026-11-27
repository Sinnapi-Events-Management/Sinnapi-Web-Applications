import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { BANK_ACCOUNT_KEY, useVendorBankAccount } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';
import { confirmPassword } from '@/lib/accountApi';
import {
  bankAccountFormSchema,
  emptyBankAccountValues,
  toBankAccountArgs,
  type BankAccountFormValues,
} from '../schema';

/** What `set_vendor_bank_account` raises when this session has not re-confirmed its password. */
const REAUTH_REQUIRED = 'reauth_required';

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
 *
 * Changing where payouts go is the most valuable thing a thief holding an
 * unlocked phone could do, and sessions now last for weeks — so the database
 * refuses the write (`reauth_required`) unless THIS session confirmed the
 * password in the last 15 minutes. When it does, the confirm dialog opens and
 * the same values are saved again on success; nothing the vendor typed is lost.
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

  const [confirmOpen, setConfirmOpen] = useState(false);
  // The submission waiting on the password, kept outside render state: it holds
  // the raw account number and must never be rendered or logged.
  const pendingRef = useRef<BankAccountFormValues | null>(null);

  const save = async (values: BankAccountFormValues) => {
    setError(null);
    const { error: rpcError } = await supabase.rpc(
      'set_vendor_bank_account',
      toBankAccountArgs(values, vendorId),
    );
    if (rpcError) {
      if (rpcError.message === REAUTH_REQUIRED) {
        pendingRef.current = values;
        setConfirmOpen(true);
        return;
      }
      setError(rpcError.message);
      return;
    }
    pendingRef.current = null;
    reset(emptyBankAccountValues);
    await qc.invalidateQueries({ queryKey: [BANK_ACCOUNT_KEY, vendorId] });
    setToast(true);
  };

  const submit = handleSubmit(save);

  const confirm = {
    open: confirmOpen,
    onConfirm: confirmPassword,
    onConfirmed: () => {
      setConfirmOpen(false);
      const values = pendingRef.current;
      if (values) void save(values);
    },
    onClose: () => {
      setConfirmOpen(false);
      pendingRef.current = null;
    },
  };

  return {
    control,
    current: current ?? null,
    loadingCurrent,
    error,
    busy: isSubmitting,
    toast,
    dismissToast: () => setToast(false),
    submit,
    confirm,
  };
}
