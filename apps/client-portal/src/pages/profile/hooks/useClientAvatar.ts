import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProfileImageUpload } from '@sinnapi/ui/profile';
import { supabase } from '@/lib/supabase';
import { PUBLIC_MEDIA_BUCKET, publicMediaStorage } from '@/lib/profileImage';

/** Toast copy for the two outcomes. */
const MESSAGES = {
  updated: 'Your profile photo has been updated.',
  removed: 'Your profile photo has been removed.',
};

/**
 * Binds the shared profile-image flow to this client's own account row.
 *
 * Everything fiddly — validation, squaring, the object-URL preview, key
 * construction, deleting the image that was replaced, and the upload/commit
 * ordering that keeps a half-failed swap from destroying the current photo —
 * lives in `useProfileImageUpload`. What is left here is the only decision that
 * is this portal's: the write lands on `profiles.avatar_url`, and the shell's
 * AppBar reads the same `['profile']` entry, so its avatar updates in the same
 * tick as this card.
 */
export function useClientAvatar(
  profileId: string | null,
  currentUrl: string | null,
  onDone?: (message: string) => void,
) {
  const qc = useQueryClient();

  const commit = useCallback(
    async (url: string | null) => {
      if (!profileId) {
        throw new Error('Your session has expired. Sign in again to change your photo.');
      }
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', profileId);
      if (error) throw new Error(error.message);
      await qc.invalidateQueries({ queryKey: ['profile'] });
    },
    [profileId, qc],
  );

  return useProfileImageUpload({
    target: { bucket: PUBLIC_MEDIA_BUCKET, ownerId: profileId, slug: 'avatar', currentUrl },
    storage: publicMediaStorage,
    commit,
    onDone,
    messages: MESSAGES,
  });
}
