import { useCallback } from 'react';
import { useLeaveGuard } from '@sinnapi/ui/forms';
import { useUrlTab, type ProfileSectionState } from '@sinnapi/ui/profile';
import type { ProfileModel } from '@/lib/types';
import { PERSONAL_SECTIONS, SECTION_PARAM, type PersonalSectionKey } from '../schema';
import { useAccountProfileForm } from './useAccountProfileForm';

/**
 * The Personal tab's state. Only "Your details" is a draft; the photo saves on
 * pick and the account facts are read-only, so the save bar belongs to the form.
 */
export function usePersonalWorkspace(profile: ProfileModel, onDone: (message: string) => void) {
  const form = useAccountProfileForm(profile, onDone);
  const { tab: section, setTab: setSection } = useUrlTab(PERSONAL_SECTIONS, {
    param: SECTION_PARAM,
  });
  useLeaveGuard(form.isDirty);

  const hasErrors = Object.keys(form.errors).length > 0;

  const stateOf = (key: PersonalSectionKey): ProfileSectionState | null => {
    if (key !== 'details') return null;
    if (hasErrors) return 'error';
    return form.isDirty ? 'dirty' : null;
  };

  const { save } = form;
  const onSave = useCallback(() => {
    void save(() => setSection('details'));
  }, [save, setSection]);

  return {
    section,
    setSection,
    stateOf,
    control: form.control,
    busy: form.busy,
    saveBar: {
      open: form.isDirty,
      busy: form.busy,
      onSave,
      onDiscard: form.revert,
      errors: form.isDirty && form.error ? [form.error] : [],
    },
  };
}
