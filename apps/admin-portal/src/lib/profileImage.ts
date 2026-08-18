import type { ObjectStoragePort } from '@sinnapi/ui/profile';
import { supabase } from './supabase';

/**
 * Profile pictures live in the existing public bucket. Its policies already say
 * exactly what this flow needs — anyone may read, but only the owner may write or
 * delete their own objects — and it caps uploads at 10 MB / image mime types, so
 * no new bucket or migration is involved.
 */
export const PUBLIC_MEDIA_BUCKET = 'public-media';

/**
 * This portal's half of the profile kit's storage contract.
 *
 * A module-level constant rather than a hook: it closes over nothing, and a fresh
 * object each render would churn the identity `useProfileImageUpload` holds in its
 * callback dependencies.
 */
export const publicMediaStorage: ObjectStoragePort = {
  async upload(path, blob) {
    const { error } = await supabase.storage
      .from(PUBLIC_MEDIA_BUCKET)
      .upload(path, blob, { contentType: blob.type, upsert: true });
    if (error) throw new Error(error.message);
  },

  publicUrl(path) {
    return supabase.storage.from(PUBLIC_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
  },

  // Cleanup is best-effort by contract: a stray object is strictly better than
  // failing a save the user has already seen succeed, so nothing here throws.
  async remove(paths) {
    try {
      await supabase.storage.from(PUBLIC_MEDIA_BUCKET).remove(paths);
    } catch {
      /* orphaned object — harmless, and not worth failing the save over */
    }
  },
};
