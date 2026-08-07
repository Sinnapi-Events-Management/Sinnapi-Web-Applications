import { useCallback, useEffect, useMemo, useState } from 'react';
import { useServiceRegionOptions, useVendorCoverage, useSetVendorCoverage } from '@/hooks/queries';

/**
 * Owns the coverage editor on the vendor detail page: the current coverage, the
 * dialog's draft selection, and the write.
 *
 * The draft is separate from the saved value so a staff edit is atomic from the
 * operator's point of view too — they tick several regions, then commit, and
 * cancelling leaves the vendor exactly as they found it. Opening the dialog
 * re-seeds the draft from the server's copy, so a cancelled edit never leaks
 * into the next one.
 */
export function useVendorCoverageEdit(vendorId: string) {
  const regions = useServiceRegionOptions();
  const coverage = useVendorCoverage(vendorId);
  const save = useSetVendorCoverage(vendorId);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);

  const keys = useMemo(() => coverage.data ?? [], [coverage.data]);

  // Keeps the draft honest while the dialog sits open and the query refetches.
  useEffect(() => {
    if (!open) setDraft(keys);
  }, [keys, open]);

  const openDialog = useCallback(() => {
    setDraft(keys);
    setOpen(true);
  }, [keys]);

  const closeDialog = useCallback(() => setOpen(false), []);

  const toggle = useCallback((key: string) => {
    setDraft((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }, []);

  const confirm = useCallback(async () => {
    await save.mutateAsync(draft);
    setOpen(false);
  }, [save, draft]);

  /** Region names for the chips, in reference order rather than insertion order. */
  const labels = useMemo(
    () =>
      (regions.data ?? [])
        .filter((region) => keys.includes(region.key))
        .map((region) => region.name),
    [regions.data, keys],
  );

  return {
    regions: regions.data ?? [],
    keys,
    labels,
    isLoading: coverage.isLoading,
    error: coverage.error,
    open,
    draft,
    toggle,
    openDialog,
    closeDialog,
    confirm,
    busy: save.isPending,
    saveError: save.error,
  };
}
