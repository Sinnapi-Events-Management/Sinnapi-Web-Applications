import { useMemo } from 'react';
import { useVendorUnavailableDates } from './queries';

/**
 * A vendor's unavailable days, in the two shapes the screens need them.
 *
 * The calendar wants a list to mark; the forms want to ask about one date at a
 * time, which is a `Set` lookup rather than a linear scan on every keystroke.
 * Both come from the same read, so the profile and the request dialog can never
 * disagree about whether the 18th is free.
 *
 * Note what this deliberately does *not* do: nothing here disables a date.
 * Availability is advisory to a client — a vendor may well move things for the
 * right job, and a date picker that silently refuses the day someone had in
 * mind loses the request rather than the date. The forms mark it and warn; the
 * vendor still decides.
 */
export function useVendorUnavailability(vendorId: string | undefined) {
  const { data, isLoading, error } = useVendorUnavailableDates(vendorId);

  const dates = useMemo(() => data ?? [], [data]);
  const lookup = useMemo(() => new Set(dates), [dates]);

  return {
    dates,
    isLoading,
    error,
    /** True only for a date this vendor has actually closed. `''` is never unavailable. */
    isUnavailable: (date: string) => Boolean(date) && lookup.has(date),
  };
}
