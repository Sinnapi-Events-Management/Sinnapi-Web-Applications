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
 * The vendor's own photo — `profiles.avatar_url`, the person rather than the
 * business (see `useVendorLogo` for the listing image).
 *
 * This is what clients see beside your messages and what staff see on your
 * account, so it is worth having even for a vendor whose listing carries a logo.
 * The shell's AppBar prefers the logo and falls back to this, so removing the logo
 * reveals this photo rather than an empty circle.
 */
export function useVendorAvatar(
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
