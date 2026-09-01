import { useMemo } from 'react';
import { useSavedForm } from '@sinnapi/ui/forms';
import type { ProfileModel } from '@/lib/types';
import { accountFormSchema, toAccountFormValues } from '../schema';
import { useAccountDetails } from './useAccountDetails';

/**
 * The personal details form's state: the profile row projected onto the form's
 * shape, the `profiles` write, and the binding between them.
 *
 * The mirror of `useBusinessProfileForm`, and separate from it for the same reason
 * the two forms are separate — a vendor's legal name and their trading name are
 * different facts on different tables, and one hook writing both is how a sole
 * trader's own name ends up on a public listing.
 */
export function useAccountProfileForm(
  profile: ProfileModel | null | undefined,
  onDone: (message: string) => void,
) {
  const { busy, error, save } = useAccountDetails(profile?.id ?? null, onDone);
  const values = useMemo(() => toAccountFormValues(profile), [profile]);
  const form = useSavedForm(accountFormSchema, values, save);

  return { ...form, busy, error };
}
