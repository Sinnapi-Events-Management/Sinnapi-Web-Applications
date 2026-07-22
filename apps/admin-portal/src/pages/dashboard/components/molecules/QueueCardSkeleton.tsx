import { Card, Skeleton, Stack } from '@sinnapi/ui';

/**
 * Placeholder matching `QueueCard`'s footprint — badge + label, count, status
 * line — so the queue band keeps its height and the page does not jump when the
 * first payload lands.
 */
export default function QueueCardSkeleton() {
  return (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 3, p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <Skeleton variant="rounded" width={34} height={34} />
        <Skeleton variant="text" width="60%" />
      </Stack>
      <Skeleton variant="text" width="45%" height={40} sx={{ mt: 1 }} />
      <Skeleton variant="text" width="70%" height={20} sx={{ mt: 0.5 }} />
    </Card>
  );
}
