import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProfileImageUpload } from '@sinnapi/ui/profile';
import { supabase } from '@/lib/supabase';
import { PUBLIC_MEDIA_BUCKET, publicMediaStorage } from '@/lib/profileImage';
import { vendorProfileKey } from './useProfile';

/** Toast copy for the two outcomes. */
const MESSAGES = {
  updated: 'Your business logo has been updated.',
  removed: 'Your business logo has been removed.',
};

/**
 * The vendor's public listing image — `vendors.primary_image_url`.
 *
 * Distinct from the personal avatar in `useVendorAvatar`, and that distinction is
 * the whole reason both exist: this one is what clients see on the listing and in
 * search results, so it is owned by the *business* record. Changing your own
 * photo must not silently re-brand your listing.
 *
 * The object is keyed under the vendor id rather than the user id, which is what
 * the bucket's path convention asks for. That works because storage's insert
 * policy checks `owner = auth.uid()` on the object row, not the first path
 * segment — the segment is a convention for keeping one entity's media separable,
 * and the vendor id is the right entity here.
 *
 * Both the page query and `['my-vendor']` are invalidated: the latter backs
 * `VendorProvider`, which is what the shell's AppBar avatar reads.
 */
export function useVendorLogo(
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
        qc.invalidateQueries({ queryKey: vendorProfileKey(vendorId) }),
        qc.invalidateQueries({ queryKey: ['my-vendor'] }),
      ]);
    },
    [qc, vendorId],
  );

  return useProfileImageUpload({
    target: { bucket: PUBLIC_MEDIA_BUCKET, ownerId: vendorId, slug: 'logo', currentUrl },
    storage: publicMediaStorage,
    commit,
    onDone,
    messages: MESSAGES,
  });
}
