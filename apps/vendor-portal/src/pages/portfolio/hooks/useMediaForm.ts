import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { rpcErrorMessage } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import {
  MEDIA_ERRORS,
  emptyMediaValues,
  mediaFormSchema,
  toMediaInsert,
  type MediaFormValues,
  type MediaType,
} from '../schema';
import { useMediaUpload } from './useMediaUpload';

export type MediaFormOptions = {
  vendorId: string;
  /** Where the new rows land in the vendor's curated order. */
  nextSortOrder: number;
  /** True when the portfolio has no cover yet, so the first image becomes one. */
  needsCover: boolean;
  onSuccess: () => void;
};

/**
 * The add-media dialog: what is being added, and the rows it becomes.
 *
 * The form owns the metadata (type, source, caption) and `useMediaUpload` owns
 * the bytes, because a `File` is not form state — it cannot be serialised,
 * validated by zod, or reset, and holding one in react-hook-form fights the
 * library the whole way. Submitting joins the two.
 *
 * Inserts are sequential rather than parallel. `tg_enforce_media_limit` counts
 * existing rows on every insert, so a batch fired at once could slip several past
 * a cap of one remaining; one at a time means the trigger sees each predecessor
 * and refuses at exactly the right file. Whatever landed before the refusal
 * stays — the vendor keeps the eight photos that fit and is told why the ninth
 * did not.
 */
export function useMediaForm({ vendorId, nextSortOrder, needsCover, onSuccess }: MediaFormOptions) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const form = useZodForm(mediaFormSchema, { defaultValues: emptyMediaValues });
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = form;

  const mediaType = watch('media_type') as MediaType;
  const source = watch('source');
  const upload = useMediaUpload(vendorId, mediaType);

  /**
   * Switching type mid-dialog throws away anything already staged: a WebP
   * re-encoded for `public-media` has no business being filed as a video, and
   * silently keeping it would upload it to the wrong bucket.
   */
  function changeType(next: MediaType) {
    if (next === mediaType) return;
    upload.discard();
    setValue('media_type', next, { shouldValidate: false });
  }

  function changeSource(next: 'upload' | 'link') {
    if (next === source) return;
    if (next === 'link') upload.discard();
    setValue('source', next, { shouldValidate: false });
  }

  async function insertRow(
    values: MediaFormValues,
    storagePath: string,
    url: string,
    offset: number,
  ) {
    return supabase.from('vendor_media').insert(
      toMediaInsert({
        vendorId,
        mediaType: values.media_type,
        storagePath,
        url,
        caption: values.caption,
        sortOrder: nextSortOrder + offset,
        // Only the very first image of the batch can claim a vacant cover slot.
        isPrimary: needsCover && values.media_type === 'image' && offset === 0,
      }),
    );
  }

  const submit = handleSubmit(async (values) => {
    setError(null);

    if (values.source === 'link') {
      const url = values.url.trim();
      const { error: insertError } = await insertRow(values, url, url, 0);
      if (insertError) {
        setError(rpcErrorMessage(insertError, MEDIA_ERRORS));
        return;
      }
    } else {
      if (upload.uploaded.length === 0) {
        setError('Add at least one file, or switch to “Paste a link”.');
        return;
      }

      let added = 0;
      for (const file of upload.uploaded) {
        const { error: insertError } = await insertRow(values, file.path, file.publicUrl, added);
        if (insertError) {
          setError(rpcErrorMessage(insertError, MEDIA_ERRORS));
          break;
        }
        added += 1;
      }

      if (added === 0) return;
      // Every object that became a row is now owned by it; the rest are still
      // the dialog's problem and `discard` on close will clear them.
      upload.commit();
      if (added < upload.uploaded.length) {
        qc.invalidateQueries({ queryKey: ['v-media', vendorId] });
        return; // Keep the dialog open on a partial batch, with the reason shown.
      }
    }

    qc.invalidateQueries({ queryKey: ['v-media', vendorId] });
    onSuccess();
  });

  return {
    control,
    mediaType,
    source,
    error,
    upload,
    busy: isSubmitting || upload.busy,
    changeType,
    changeSource,
    submit,
  };
}
