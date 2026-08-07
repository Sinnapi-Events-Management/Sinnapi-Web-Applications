import { Card, CardContent, Skeleton } from '@sinnapi/ui';

/**
 * Placeholder in the shape of a PublicEventCard — chip row, title, meta line,
 * description — so the first paint doesn't reflow the feed when data lands.
 */
export default function EventCardSkeleton() {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Skeleton width={110} height={24} sx={{ mb: 1 }} />
        <Skeleton width="75%" height={28} />
        <Skeleton width="55%" />
        <Skeleton width="90%" />
        <Skeleton width="80%" />
      </CardContent>
    </Card>
  );
}
