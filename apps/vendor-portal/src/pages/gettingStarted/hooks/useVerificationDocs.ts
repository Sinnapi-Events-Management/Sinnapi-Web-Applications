import { useCallback, useMemo, useState } from 'react';
import type { UploadedFile } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import type { VendorOnboardingModel } from './useOnboardingStatus';
import { useVendorPatch } from './useVendorPatch';

/** The two `vendors` columns that hold a private document path. */
export type DocField = 'national_id_path' | 'proof_of_work_path';

/** Mirrors the `vendor-private` bucket's own limits, so we reject before the round trip. */
export const DOC_ACCEPT = 'image/jpeg,image/png,application/pdf';
export const DOC_MAX_MB = 20;

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
const sanitize = (name: string) => name.replace(/[^\w.-]+/g, '-').slice(-80);
const basename = (path: string) => path.split('/').pop() ?? path;

/** A path already on the row, shown as a settled upload rather than an empty box. */
const fromPath = (path: string | null): UploadedFile[] =>
  path ? [{ id: path, name: basename(path), status: 'done' }] : [];

/**
 * Verification documents: upload to the PRIVATE `vendor-private` bucket, then
 * store the path on the vendor row.
 *
 * The path is all that is ever stored or read back — the bucket is not public
 * and its select policy admits only the owner and staff holding `vendor.review`,
 * so a leaked column value is not a leaked document. That is also why a document
 * already on file renders from its filename instead of a preview: producing a
 * thumbnail would mean signing a URL for a file the vendor does not need to see
 * again to know it is there.
 */
export function useVerificationDocs(vendorId: string, vendor: VendorOnboardingModel | null) {
  const patch = useVendorPatch(vendorId);
  const [pending, setPending] = useState<Partial<Record<DocField, UploadedFile[]>>>({});
  const [error, setError] = useState<string | null>(null);

  const items = useMemo(
    () => ({
      national_id_path: pending.national_id_path ?? fromPath(vendor?.national_id_path ?? null),
      proof_of_work_path:
        pending.proof_of_work_path ?? fromPath(vendor?.proof_of_work_path ?? null),
    }),
    [pending, vendor?.national_id_path, vendor?.proof_of_work_path],
  );

  const select = useCallback(
    async (field: DocField, files: File[]) => {
      const file = files[0];
      if (!file) return;
      setError(null);

      const id = uid();
      setPending((p) => ({
        ...p,
        [field]: [{ id, name: file.name, size: file.size, status: 'uploading' }],
      }));

      const path = `${vendorId}/${field}/${id}-${sanitize(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from('vendor-private')
        .upload(path, file, { contentType: file.type || undefined, upsert: false });

      if (uploadError) {
        setPending((p) => ({
          ...p,
          [field]: [{ id, name: file.name, status: 'error', error: uploadError.message }],
        }));
        return;
      }

      try {
        await patch.mutateAsync({ [field]: path });
        // Hand the field back to the row now that it carries the new path, so
        // there is one source of truth for "what is on file".
        setPending((p) => ({ ...p, [field]: undefined }));
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [patch, vendorId],
  );

  /**
   * Clears the column. The object is deliberately left in the bucket: a vendor
   * replacing a blurred ID should not be able to destroy the copy our review
   * team may already have acted on, and orphans there are cheap.
   */
  const remove = useCallback(
    async (field: DocField) => {
      setError(null);
      setPending((p) => ({ ...p, [field]: [] }));
      try {
        await patch.mutateAsync({ [field]: null });
        setPending((p) => ({ ...p, [field]: undefined }));
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [patch],
  );

  return { items, select, remove, error, busy: patch.isPending };
}
