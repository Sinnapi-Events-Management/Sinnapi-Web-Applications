import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DELETION_REQUEST_KEY, useLatestDeletionRequest, useProfile } from '@/hooks/queries';
import { changePassword, exportMyData, requestDataDeletion } from '@/lib/accountApi';

/**
 * Everything the settings page needs, assembled in one place: the profile it
 * describes, the erasure request it may have to report, and the three actions
 * its cards fire.
 *
 * The page itself renders shared components from `@sinnapi/ui/settings` and
 * holds no state at all — this is the seam between them. `changePassword` and
 * `exportMyData` pass straight through because neither has anything to
 * invalidate; the deletion request is wrapped so the freshly filed row is read
 * back and the button turns into its own status note without a reload.
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
