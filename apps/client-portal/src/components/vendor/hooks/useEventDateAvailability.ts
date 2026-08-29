import { useWatch, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { useVendorUnavailability } from '@/hooks/useVendorUnavailability';

/**
 * Whether the date currently in a form is one the vendor has closed.
 *
 * Watches the field rather than taking the value as a prop so the warning
 * appears the moment a day is picked, without the parent form re-rendering to
 * carry it — the request dialogs are long, and re-rendering the payment-terms
 * comparison on every date change is a real cost.
 *
 * `vendorId` is optional because one of the two call sites picks the vendor
 * inside the form: until they have, there is no calendar to check against, and
 * the query stays disabled rather than firing for `undefined`.
 */
export function useEventDateAvailability<T extends FieldValues>(
  control: Control<T>,
  name: FieldPath<T>,
  vendorId: string | undefined,
) {
  const { dates, isUnavailable } = useVendorUnavailability(vendorId);
  const value = useWatch({ control, name }) as string | undefined;

  return {
    /** Days to mark on the grid. Empty until a vendor is known. */
    unavailableDates: dates,
    /** True only once a closed day is actually selected. */
    isDateUnavailable: isUnavailable(value ?? ''),
  };
}
