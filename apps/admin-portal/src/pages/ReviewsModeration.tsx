import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Stack, Card, CardContent, Typography, Rating, Button, Alert } from "@mui/material";
import PageTitle from "@/components/ui/PageTitle";
import EmptyState from "@/components/ui/EmptyState";
import StatusChip from "@/components/ui/StatusChip";
import QueryState from "@/components/ui/QueryState";
import { useReviewReports } from "@/hooks/queries";
import { supabase } from "@/lib/supabase";
import { formatDate, titleize } from "@/lib/config";
import { one } from "@/lib/rel";

export default function ReviewsModeration() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useReviewReports();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const rows = data ?? [];

  function refresh() { qc.invalidateQueries({ queryKey: ["review-reports"] }); }

  async function removeReview(reviewId: string, reportId: string) {
    setBusy(reportId); setErr(null);
    const r1 = await supabase.from("reviews").update({ status: "removed", moderation_status: "removed" }).eq("id", reviewId);
    const r2 = await supabase.from("review_reports").update({ status: "actioned" }).eq("id", reportId);
    setBusy(null);
    if (r1.error || r2.error) { setErr((r1.error ?? r2.error)!.message); return; }
    refresh();
  }

  async function dismiss(reportId: string) {
    setBusy(reportId); setErr(null);
    const { error } = await supabase.from("review_reports").update({ status: "dismissed" }).eq("id", reportId);
    setBusy(null);
    if (error) { setErr(error.message); return; }
    refresh();
  }

  return (
    <>
      <PageTitle title="Review moderation" subtitle="Reported reviews awaiting moderation." />
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? <EmptyState title="No reported reviews" /> : (
          <Stack spacing={2}>
            {rows.map((rep: any) => {
              const review = one<any>(rep.reviews);
              return (
                <Card key={rep.id} variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2">Reported: {titleize(rep.reason)}</Typography>
                      <StatusChip status={rep.status} />
                    </Stack>
                    {review && <><Rating value={review.rating} size="small" readOnly sx={{ mt: 1 }} /><Typography variant="body2" color="text.secondary">{review.body}</Typography></>}
                    <Typography variant="caption" color="text.secondary">{formatDate(rep.created_at)}</Typography>
                    {rep.status === "open" && (
                      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                        <Button size="small" color="error" variant="contained" disabled={busy === rep.id} onClick={() => removeReview(review?.id, rep.id)}>Remove review</Button>
                        <Button size="small" disabled={busy === rep.id} onClick={() => dismiss(rep.id)}>Dismiss report</Button>
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </QueryState>
    </>
  );
}
