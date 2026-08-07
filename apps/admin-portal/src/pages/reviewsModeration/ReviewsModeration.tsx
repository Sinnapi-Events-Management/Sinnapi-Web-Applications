import {
  Stack,
  Card,
  CardContent,
  Typography,
  Rating,
  Button,
  Alert,
  PageTitle,
  QueryState,
  StatusChip,
} from '@sinnapi/ui';
import { formatDate, titleize } from '@/lib/config';
import { one } from '@/lib/rel';
import type { ReviewRef } from '@/lib/types';
import { useReviewsModeration } from './hooks/useReviewsModeration';
import { EmptyState } from '@sinnapi/ui/router';

export default function ReviewsModeration() {
  const { rows, isLoading, error, busy, err, removeReview, dismiss } = useReviewsModeration();

  return (
    <>
      <PageTitle title="Review moderation" subtitle="Reported reviews awaiting moderation." />
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No reported reviews" />
        ) : (
          <Stack spacing={2}>
            {rows.map((rep) => {
              const review = one<ReviewRef>(rep.reviews);
              return (
                <Card key={rep.id} variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2">Reported: {titleize(rep.reason)}</Typography>
                      <StatusChip status={rep.status} />
                    </Stack>
                    {review && (
                      <>
                        <Rating value={review.rating} size="small" readOnly sx={{ mt: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          {review.body}
                        </Typography>
                      </>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(rep.created_at)}
                    </Typography>
                    {rep.status === 'open' && (
                      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                        <Button
                          size="small"
                          color="error"
                          variant="contained"
                          disabled={busy === rep.id}
                          onClick={() => removeReview(review?.id, rep.id)}
                        >
                          Remove review
                        </Button>
                        <Button
                          size="small"
                          disabled={busy === rep.id}
                          onClick={() => dismiss(rep.id)}
                        >
                          Dismiss report
                        </Button>
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
