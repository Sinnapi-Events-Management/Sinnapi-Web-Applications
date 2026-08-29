import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { rpcErrorMessage } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import { pathFromPublicUrl, portfolioBucket, removePortfolioObject } from '@/lib/portfolioStorage';
import type { MediaModel } from '@/lib/types';
import { MEDIA_ERRORS } from '../schema';

/** A destructive action waiting on the vendor's confirmation. */
export type PendingRemoval = { item: MediaModel };

/**
 * What can happen to one item: removal, and promotion to cover.
 *
 * Separate from the list hook because an action's in-flight state belongs to one
 * tile while the filter and the order belong to the whole page — one hook holding
 * both would re-render every tile whenever any of them was touched.
 */
export function useMediaActions(vendorId: string) {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingRemoval | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    qc.invalidateQueries({ queryKey: ['v-media', vendorId] });
  }

  /**
   * Removal is a soft delete, not a `DELETE`.
   *
   * The row carries `deleted_at`/`deleted_by`, every read already filters on it,
   * and the plan-limit trigger counts only undeleted rows — so stamping it frees
   * the vendor's slot exactly as a hard delete would while leaving the history
   * intact. The stored object is then removed best-effort: the row is hidden
   * either way, and a failed storage call must not surface as a failed removal.
   */
  async function remove(item: MediaModel) {
    setBusyId(item.id);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from('vendor_media')
      .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null })
      .eq('id', item.id);

    if (updateError) {
      setBusyId(null);
      setError(rpcErrorMessage(updateError, MEDIA_ERRORS));
      return;
    }

    const bucket = portfolioBucket(item.media_type === 'video' ? 'video' : 'image');
    const path = pathFromPublicUrl(item.url, bucket);
    if (path) await removePortfolioObject(bucket, path);

    setBusyId(null);
    setPending(null);
    refresh();
  }

  /**
   * Exactly one item is the cover, so the old one is cleared before the new one
   * is set. Two statements rather than one because the table has no partial
   * unique index to upsert against; the clear runs first so a failure between
   * them leaves no cover rather than two.
   */
  async function setCover(item: MediaModel) {
    setBusyId(item.id);
    setError(null);

    const { error: clearError } = await supabase
      .from('vendor_media')
      .update({ is_primary: false })
      .eq('vendor_id', vendorId)
      .eq('is_primary', true);

    const { error: promoteError } = clearError
      ? { error: clearError }
      : await supabase.from('vendor_media').update({ is_primary: true }).eq('id', item.id);

    setBusyId(null);
    if (promoteError) {
      setError(rpcErrorMessage(promoteError, MEDIA_ERRORS));
      return;
    }
    refresh();
  }

  return {
    busyId,
    error,
    pending,
    dismissError: () => setError(null),
    requestRemoval: (item: MediaModel) => setPending({ item }),
    cancelRemoval: () => setPending(null),
    confirmRemoval: () => pending && remove(pending.item),
    setCover,
  };
}
