import { Stack, Card, CardContent, Typography, Rating, Box } from "@mui/material";
import PageTitle from "@/components/ui/PageTitle";
import EmptyState from "@/components/ui/EmptyState";
import StatusChip from "@/components/ui/StatusChip";
import QueryState from "@/components/ui/QueryState";
import { useReviews } from "@/hooks/queries";
import { formatDate } from "@/lib/config";
import { one } from "@/lib/rel";

export default function Reviews() {
  const { data, isLoading, error } = useReviews();
  const rows = data ?? [];

  return (
    <>
      <PageTitle title="My reviews" subtitle="Reviews you've left for vendors." />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No reviews yet" description="After a completed booking you can review the vendor." ctaLabel="View bookings" ctaHref="/bookings" />
        ) : (
          <Stack spacing={2}>
            {rows.map((r: any) => (
              <Card key={r.id} variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">{one<any>(r.vendors)?.business_name ?? "Vendor"}</Typography>
                    <StatusChip status={r.status} />
                  </Stack>
                  <Rating value={r.rating} size="small" readOnly sx={{ mt: 0.5 }} />
                  {r.title && <Typography variant="subtitle2" sx={{ mt: 0.5 }}>{r.title}</Typography>}
                  {r.body && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{r.body}</Typography>}
                  <Box sx={{ mt: 1 }}><Typography variant="caption" color="text.secondary">{formatDate(r.created_at)}</Typography></Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </QueryState>
    </>
  );
}
