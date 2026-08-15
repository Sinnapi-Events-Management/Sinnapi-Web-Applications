import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DELETION_REQUEST_KEY, useLatestDeletionRequest, useProfile } from '@/hooks/queries';
import { changePassword, exportMyData, requestDataDeletion } from '@/lib/accountApi';

/**
 * Everything the settings page needs: the profile the security card names, the
 * erasure request the privacy card may have to report, and the three actions the
 * security and privacy cards fire.
 *
 * The profile is read but no longer edited here — name, phone and photo moved to
 * the profile page's Personal tab, so a vendor's own details sit next to their
 * photo rather than under a heading about payouts and privacy. What is left is
 * read-only: the card needs the email to say which account it is about.
 *
 * `changePassword` and `exportMyData` pass straight through because neither has
 * anything to invalidate; the deletion request is wrapped so the freshly filed row
 * is read back and the button becomes its own status note without a reload.
 */
export function useSettings() {
  const qc = useQueryClient();
  const { data: profile, isLoading, error } = useProfile();
  const { data: deletionRequest, isLoading: loadingDeletionRequest } = useLatestDeletionRequest();

  const requestDeletion = useCallback(
    async (reason: string) => {
      await requestDataDeletion(reason);
      await qc.invalidateQueries({ queryKey: DELETION_REQUEST_KEY });
    },
    [qc],
  );

  return {
    profile,
    isLoading,
    error,
    deletionRequest,
    loadingDeletionRequest,
    changePassword,
    exportMyData,
    requestDeletion,
  };
}
