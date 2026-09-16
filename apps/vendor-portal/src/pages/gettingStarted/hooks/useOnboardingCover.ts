import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProfileImageUpload } from '@sinnapi/ui/profile';
import { supabase } from '@/lib/supabase';
import { PUBLIC_MEDIA_BUCKET, publicMediaStorage } from '@/lib/profileImage';
import { onboardingKey } from './useOnboardingStatus';

const MESSAGES = {
  updated: 'Your cover image has been saved.',
  removed: 'Your cover image has been removed.',
};

/**
 * The listing's cover image — `vendors.primary_image_url`.
 *
 * The wide image a public vendor card prefers over the profile photo, and the
 * same column the profile page's logo card writes. Optional by design: a vendor
 * with only a profile photo still renders correctly everywhere, because every
 * public reader falls back to it.
 */
export function useOnboardingCover(
  vendorId: string,
  currentUrl: string | null,
  onDone?: (message: string) => void,
) {
  const qc = useQueryClient();

  const commit = useCallback(
    async (url: string | null) => {
      const { error } = await supabase
        .from('vendors')
        .update({ primary_image_url: url })
        .eq('id', vendorId);
      if (error) throw new Error(error.message);
      await Promise.all([
        qc.invalidateQueries({ queryKey: onboardingKey(vendorId) }),
        qc.invalidateQueries({ queryKey: ['my-vendor'] }),
        qc.invalidateQueries({ queryKey: ['v-profile', vendorId] }),
      ]);
    },
    [qc, vendorId],
  );

  return useProfileImageUpload({
    target: { bucket: PUBLIC_MEDIA_BUCKET, ownerId: vendorId, slug: 'cover', currentUrl },
    storage: publicMediaStorage,
    commit,
    onDone,
    messages: MESSAGES,
  });
}
