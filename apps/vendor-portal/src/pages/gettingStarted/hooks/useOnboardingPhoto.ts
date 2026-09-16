import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProfileImageUpload } from '@sinnapi/ui/profile';
import { supabase } from '@/lib/supabase';
import { PUBLIC_MEDIA_BUCKET, publicMediaStorage } from '@/lib/profileImage';
import { onboardingKey } from './useOnboardingStatus';

const MESSAGES = {
  updated: 'Your profile photo has been saved.',
  removed: 'Your profile photo has been removed.',
};

/**
 * The listing's profile photo — `vendors.profile_image_url`.
 *
 * That column rather than `primary_image_url`: this is the logo or headshot that
 * represents the business (admin lists render it as the vendor's avatar), while
 * `primary_image_url` is the wide cover image a public card prefers. The old
 * public application drew the same line, and keeping it means an approved
 * vendor's photo lands where every existing reader already looks for it.
 */
export function useOnboardingPhoto(
  vendorId: string,
  currentUrl: string | null,
  onDone?: (message: string) => void,
) {
  const qc = useQueryClient();

  const commit = useCallback(
    async (url: string | null) => {
      const { error } = await supabase
        .from('vendors')
        .update({ profile_image_url: url })
        .eq('id', vendorId);
      if (error) throw new Error(error.message);
      await Promise.all([
        qc.invalidateQueries({ queryKey: onboardingKey(vendorId) }),
        qc.invalidateQueries({ queryKey: ['my-vendor'] }),
      ]);
    },
    [qc, vendorId],
  );

  return useProfileImageUpload({
    target: { bucket: PUBLIC_MEDIA_BUCKET, ownerId: vendorId, slug: 'profile', currentUrl },
    storage: publicMediaStorage,
    commit,
    onDone,
    messages: MESSAGES,
  });
}
