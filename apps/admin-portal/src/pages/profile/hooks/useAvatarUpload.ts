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
 * Binds the shared profile-image flow to this portal's own account row.
 *
 * All the fiddly parts — validation, squaring, the object-URL preview, key
 * construction and deleting the image that was replaced — live in
 * `useProfileImageUpload`. What is left here is the only genuinely
 * admin-portal-specific decision: the write lands on `profiles.avatar_url` for
 * the signed-in user, and the shell's AppBar reads the same `['profile']` entry,
 * so its avatar updates in the same tick as this card.
 */
export function useAvatarUpload(
  userId: string | null,
  currentUrl: string | null,
  onDone?: (message: string) => void,
) {
  const qc = useQueryClient();

  const commit = useCallback(
    async (url: string | null) => {
      if (!userId) throw new Error('Your session has expired. Sign in again to change your photo.');
      // RLS' `profiles_self_update` already scopes this to `auth.uid()`, so no
      // server function is involved.
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', userId);
      if (error) throw new Error(error.message);
      await qc.invalidateQueries({ queryKey: ['profile'] });
    },
    [qc, userId],
  );

  return useProfileImageUpload({
    target: { bucket: PUBLIC_MEDIA_BUCKET, ownerId: userId, slug: 'avatar', currentUrl },
    storage: publicMediaStorage,
    commit,
    onDone,
    messages: MESSAGES,
  });
}
