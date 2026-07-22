import { Box, Skeleton, Stack } from '@sinnapi/ui';

/** Placeholder row matching `ActivityItem`'s badge-plus-three-lines footprint. */
export default function ActivityItemSkeleton() {
  return (
    <Stack direction="row" spacing={1.5} sx={{ py: 1.25 }}>
      <Skeleton variant="rounded" width={32} height={32} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="65%" />
        <Skeleton variant="text" width="45%" height={14} />
      </Box>
    </Stack>
  );
}
