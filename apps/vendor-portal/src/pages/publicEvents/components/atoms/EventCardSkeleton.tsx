import { Card, CardContent, Divider, Skeleton, Stack } from '@sinnapi/ui';

/**
 * Placeholder in the shape of a `PublicEventCard` — chip row, title, meta line,
 * description, and the budget and action bands under their rules.
 *
 * It mirrors the real card's structure rather than approximating it: the whole
 * point of a skeleton is that nothing moves when the data lands. It lost its
 * media band along with the card's cover.
 */
export default function EventCardSkeleton() {
  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
          <Skeleton width={96} height={24} />
          <Skeleton width={84} height={24} />
        </Stack>
        <Skeleton width="80%" height={28} />
        <Skeleton width="60%" sx={{ mt: 0.5 }} />
        <Skeleton width="95%" sx={{ mt: 1.5 }} />
        <Skeleton width="70%" />

        <Divider sx={{ mt: 'auto', pt: 1.5 }} />
        <Skeleton width={64} height={18} />
        <Skeleton width="55%" height={24} />

        <Divider sx={{ my: 1.5 }} />
        <Skeleton width={132} height={36} sx={{ ml: 'auto', borderRadius: 1 }} />
      </CardContent>
    </Card>
  );
}
