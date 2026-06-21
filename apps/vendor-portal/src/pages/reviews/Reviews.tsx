import { Stack, Card, CardContent, Typography, Rating, Box } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import QueryState from '@/components/ui/QueryState';
import VendorGate from '@/vendor/VendorGate';
import ReviewResponse from '@/components/review/ReviewResponse';
import { formatDate } from '@/lib/config';
import { one } from '@/lib/rel';
import type { ProfileRel, ReviewResponseRel } from '@/lib/types';
import { useReviews } from './hooks/useReviews';

function ReviewsList({ vendorId }: { vendorId: string }) {
  const { rows, isLoading, error } = useReviews(vendorId);
  return (
    <QueryState isLoading={isLoading} error={error}>
      {rows.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          description="Reviews from completed bookings appear here. You can respond to each one."
        />
      ) : (
        <Stack spacing={2}>
          {rows.map((r) => {
            const response = one<ReviewResponseRel>(r.review_responses);
            return (
              <Card key={r.id} variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1">
                      {one<ProfileRel>(r.profiles)?.full_name ?? 'Client'}
                    </Typography>
                    <Rating value={r.rating} size="small" readOnly />
                  </Stack>
                  {r.title && (
                    <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                      {r.title}
                    </Typography>
                  )}
                  {r.body && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {r.body}
                    </Typography>
                  )}
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(r.created_at)}
                    </Typography>
                  </Box>
                  <ReviewResponse reviewId={r.id} existing={response?.body ?? undefined} />
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </QueryState>
  );
}

export default function Reviews() {
  return (
    <>
      <PageTitle title="Reviews" subtitle="Reviews from clients — respond to build trust." />
      <VendorGate>{(vendorId) => <ReviewsList vendorId={vendorId} />}</VendorGate>
    </>
  );
}
