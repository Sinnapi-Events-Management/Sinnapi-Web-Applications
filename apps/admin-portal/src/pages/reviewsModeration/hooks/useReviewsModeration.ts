import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useReviewReports } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';

export function useReviewsModeration() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useReviewReports();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const rows = data ?? [];

  function refresh() {
    qc.invalidateQueries({ queryKey: ['review-reports'] });
  }

  async function removeReview(reviewId: string | undefined, reportId: string) {
    setBusy(reportId);
    setErr(null);
    const r1 = await supabase
      .from('reviews')
      .update({ status: 'removed', moderation_status: 'removed' })
      .eq('id', reviewId);
    const r2 = await supabase
      .from('review_reports')
      .update({ status: 'actioned' })
      .eq('id', reportId);
    setBusy(null);
    if (r1.error || r2.error) {
      setErr((r1.error ?? r2.error)!.message);
      return;
    }
    refresh();
  }

  async function dismiss(reportId: string) {
    setBusy(reportId);
    setErr(null);
    const { error } = await supabase
      .from('review_reports')
      .update({ status: 'dismissed' })
      .eq('id', reportId);
    setBusy(null);
    if (error) {
      setErr(error.message);
      return;
    }
    refresh();
  }

  return {
    isLoading,
    error,
    busy,
    err,
    rows,
    removeReview,
    dismiss,
  };
}
