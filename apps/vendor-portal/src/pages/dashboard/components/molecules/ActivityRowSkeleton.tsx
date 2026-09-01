import { Box, Skeleton, Stack } from '@sinnapi/ui';

/** Placeholder for one `ActivityRow`, matching its badge-and-two-lines shape. */
export default function ActivityRowSkeleton() {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1.25, px: 0.5 }}>
      <Skeleton variant="rounded" width={32} height={32} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="55%" />
        <Skeleton variant="text" width="30%" height={14} />
      </Box>
      <Skeleton variant="rounded" width={64} height={22} />
    </Stack>
  );
}
