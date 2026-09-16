import { useCallback, useState } from 'react';
import { useLeaveGuard } from '@sinnapi/ui/forms';
import { useUrlTab, type ProfileSectionState } from '@sinnapi/ui/profile';
import { useServiceCoverage } from '@/hooks/useServiceCoverage';
import {
  BUSINESS_SECTIONS,
  SECTION_PARAM,
  sectionTouches,
  type BusinessSectionKey,
  type VendorProfileSource,
} from '../schema';
import { useBusinessProfileForm } from './useBusinessProfileForm';

/**
 * The Business tab's state: which section is open, the details form and the
 * coverage selection, and the one save bar that commits both.
 *
 * Both drafts live here rather than in their panels, so switching section keeps
 * whatever the vendor typed — only the open panel is mounted.
 *
 * They are still two writes (a `vendors` update and the coverage RPC) with no
 * transaction across them. The bar runs them side by side and reports each
 * failure separately; whichever succeeded re-baselines on its own, so a retry
 * only re-sends what didn't land.
 */
export function useBusinessWorkspace(
  vendorId: string,
  vendor: VendorProfileSource,
  onDone: (message: string) => void,
) {
  const form = useBusinessProfileForm(vendorId, vendor);
  const coverage = useServiceCoverage(vendorId);
  const { tab: section, setTab: setSection } = useUrlTab(BUSINESS_SECTIONS, {
    param: SECTION_PARAM,
  });
  const [saving, setSaving] = useState(false);

  const isDirty = form.isDirty || coverage.isDirty;
  useLeaveGuard(isDirty);

  const stateOf = (key: BusinessSectionKey): ProfileSectionState | null => {
    if (sectionTouches(key, form.errors)) return 'error';
    if (sectionTouches(key, form.dirtyFields)) return 'dirty';
    if (key === 'coverage' && coverage.isDirty) return 'dirty';
    if (key === 'coverage' && coverage.isUncovered) return 'attention';
    return null;
  };

  const { save: saveDetails, revert: revertDetails } = form;
  const { save: saveCoverage, revert: revertCoverage } = coverage;

  const saveAll = useCallback(async () => {
    setSaving(true);
    const [detailsOk, coverageOk] = await Promise.all([
      form.isDirty
        ? saveDetails((errors) => {
            const first = BUSINESS_SECTIONS.find((key) => sectionTouches(key, errors));
            if (first) setSection(first);
          })
        : true,
      coverage.isDirty ? saveCoverage() : true,
    ]);
    setSaving(false);
    if (detailsOk && coverageOk) onDone('Your listing has been updated.');
  }, [coverage.isDirty, form.isDirty, onDone, saveCoverage, saveDetails, setSection]);

  const discardAll = useCallback(() => {
    revertDetails();
    revertCoverage();
  }, [revertCoverage, revertDetails]);

  return {
    section,
    setSection,
    stateOf,
    control: form.control,
    coverage,
    fieldsBusy: saving || form.busy,
    saveBar: {
      open: isDirty,
      busy: saving,
      onSave: saveAll,
      onDiscard: discardAll,
      // Hidden once the edits are discarded: a stale failure next to "nothing to
      // save" would read as if something were still wrong.
      errors: isDirty ? [form.error, coverage.saveError].filter((e): e is string => !!e) : [],
    },
  };
}
