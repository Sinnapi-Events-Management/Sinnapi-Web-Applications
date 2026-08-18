import { useCallback, useEffect, useMemo, useState } from 'react';
import { useServiceRegions, useVendorCoverage, useSetVendorCoverage } from '@/hooks/queries';

/**
 * The coverage editor's state: the regions on offer, the vendor's current
 * selection, and the write.
 *
 * The selection is local until saved, so a vendor can tick several regions and
 * commit them once instead of firing a write per checkbox — coverage is a set,
 * and a half-applied set is exactly what `set_vendor_service_regions` exists to
 * prevent.
 *
 * The server's copy seeds that local state whenever it changes, which covers
 * both the first load and another tab (or an admin) editing the same vendor
 * underneath — without it the form would keep showing a selection the database
 * no longer holds.
 */
export function useServiceCoverage(vendorId: string, onSaved?: (message: string) => void) {
  const regions = useServiceRegions();
  const coverage = useVendorCoverage(vendorId);
  const save = useSetVendorCoverage(vendorId);

  const [selected, setSelected] = useState<string[]>([]);

  const serverKeys = useMemo(() => coverage.data ?? [], [coverage.data]);

  useEffect(() => {
    setSelected(serverKeys);
  }, [serverKeys]);

  const toggle = useCallback((key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }, []);

  // Compared as sets: tick a region and untick it again and there is nothing to
  // save, however the array order ended up.
  const isDirty =
    selected.length !== serverKeys.length || selected.some((key) => !serverKeys.includes(key));

  // Reports success through the page's own notice rather than a local snackbar, so
  // every save on the profile page confirms itself in the same place.
  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      await save.mutateAsync(selected);
      onSaved?.('Your service coverage has been updated.');
    },
    [onSaved, save, selected],
  );

  return {
    regions: regions.data ?? [],
    selected,
    toggle,
    isDirty,
    submit,
    isLoading: regions.isLoading || coverage.isLoading,
    error: regions.error ?? coverage.error,
    busy: save.isPending,
    saveError: save.error,
  };
}
