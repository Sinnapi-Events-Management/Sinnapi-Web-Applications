import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProfileImageUpload } from '@sinnapi/ui/profile';
import { supabase } from '@/lib/supabase';
import { PUBLIC_MEDIA_BUCKET, publicMediaStorage } from '@/lib/profileImage';
import { LOGO_COPY } from '../schema/copy';

/** Every query that renders the logo — refreshed after any change to it. */
const LOGO_READERS = [['my-vendor'], ['v-profile'], ['vendor-onboarding'], ['v-business-card']];

type Options = {
  vendorId: string | null;
  /** The stored logo, `vendors.primary_image_url`. */
  currentUrl: string | null;
  /**
   * The onboarding photo. Never deleted when the logo is replaced, because a
   * logo adopted from it starts life as a copy and the two must not share fate.
   */
  onboardingPhotoUrl?: string | null;
  onDone?: (message: string) => void;
};

/**
 * The one way the vendor portal changes the business logo —
 * `vendors.primary_image_url`, the image on every document and on the listing.
 *
 * Profile, the setup wizard and the logo-required dialog all call this, so
 * there is one write path, one set of caches refreshed, and one image rule:
 * kept in its own shape (`fit: 'contain'`), never centre-cropped.
 */
export function useBusinessLogo({ vendorId, currentUrl, onboardingPhotoUrl, onDone }: Options) {
  const qc = useQueryClient();

  const commit = useCallback(
    async (url: string | null) => {
      if (!vendorId) throw new Error('Your session has expired. Sign in again.');
      const { error } = await supabase
        .from('vendors')
        .update({ primary_image_url: url })
        .eq('id', vendorId);
      if (error) throw new Error(error.message);
      await Promise.all(LOGO_READERS.map((queryKey) => qc.invalidateQueries({ queryKey })));
    },
    [qc, vendorId],
  );

  return useProfileImageUpload({
    target: { bucket: PUBLIC_MEDIA_BUCKET, ownerId: vendorId, slug: 'logo', currentUrl },
    storage: publicMediaStorage,
    commit,
    onDone,
    messages: LOGO_COPY.toast,
    fit: 'contain',
    keepUrls: [onboardingPhotoUrl],
  });
}

export type BusinessLogoUpload = ReturnType<typeof useBusinessLogo>;
