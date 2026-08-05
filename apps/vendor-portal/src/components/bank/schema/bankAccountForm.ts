import { z } from 'zod';

/**
 * Account numbers vary by bank, so the rule is a shape rule rather than a
 * format one: digits, spaces and dashes only, long enough to be real. Getting
 * this wrong is expensive — the number is encrypted on write and never read
 * back, so a typo surfaces as a failed payout weeks later rather than as a
 * validation error here.
 */
const ACCOUNT_NUMBER_RE = /^[\d\s-]{6,34}$/;

export const bankAccountFormSchema = z.object({
  bank_name: z
    .string()
    .trim()
    .min(2, 'Bank name is required.')
    .max(120, 'Bank name must be 120 characters or fewer.'),
  account_name: z
    .string()
    .trim()
    .min(2, 'Account name is required.')
    .max(120, 'Account name must be 120 characters or fewer.'),
  account_number: z
    .string()
    .trim()
    .min(1, 'Account number is required.')
    .regex(ACCOUNT_NUMBER_RE, 'Enter a valid account number — digits, spaces and dashes only.'),
  branch: z.string().trim().max(120, 'Branch must be 120 characters or fewer.'),
});

export type BankAccountFormValues = z.infer<typeof bankAccountFormSchema>;

export const emptyBankAccountValues: BankAccountFormValues = {
  bank_name: '',
  account_name: '',
  account_number: '',
  branch: '',
};

/**
 * Arguments for `set_vendor_bank_account`, which encrypts the number
 * server-side. Spaces and dashes are stripped so the stored value is the digits
 * alone, however the vendor chose to group them.
 */
export function toBankAccountArgs(values: BankAccountFormValues, vendorId: string) {
  return {
    p_vendor_id: vendorId,
    p_bank_name: values.bank_name.trim(),
    p_account_name: values.account_name.trim(),
    p_account_number: values.account_number.replace(/[\s-]/g, ''),
    p_branch: values.branch.trim() || null,
    p_is_primary: true,
  };
}
