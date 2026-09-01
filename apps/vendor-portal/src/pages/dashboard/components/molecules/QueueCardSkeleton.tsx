import { Card, CardContent, Skeleton, Stack } from '@sinnapi/ui';

/** Placeholder matching `QueueCard`'s three rows, so the band doesn't reflow. */
export default function QueueCardSkeleton() {
  return (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Skeleton variant="rounded" width={34} height={34} />
          <Skeleton variant="text" width="60%" />
        </Stack>
        <Skeleton variant="text" width="45%" height={44} sx={{ mt: 1 }} />
        <Skeleton variant="text" width="70%" />
      </CardContent>
    </Card>
  );
}
