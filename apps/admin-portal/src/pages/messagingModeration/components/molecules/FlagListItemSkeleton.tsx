import { Box, Stack, Skeleton } from '@sinnapi/ui';

/** Placeholder mirroring <FlagListItem /> so the queue doesn't jump on load. */
export default function FlagListItemSkeleton() {
  return (
    <Box
      sx={{
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        borderLeftWidth: 3,
        borderLeftColor: 'divider',
        p: 1.5,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Skeleton variant="circular" width={20} height={20} />
        <Skeleton variant="text" width={90} />
        <Box sx={{ flex: 1 }} />
        <Skeleton variant="rounded" width={64} height={22} />
      </Stack>
      <Skeleton variant="text" width="95%" />
      <Skeleton variant="text" width="65%" />
    </Box>
  );
}
