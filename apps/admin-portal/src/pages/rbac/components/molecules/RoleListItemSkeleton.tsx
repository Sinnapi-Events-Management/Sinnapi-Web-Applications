import { Box, Stack, Skeleton } from '@sinnapi/ui';

/** Placeholder mirroring <RoleListItem /> so the master column doesn't jump on load. */
export default function RoleListItemSkeleton() {
  return (
    <Box sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: 'divider', borderLeftWidth: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Skeleton variant="text" width="55%" />
          <Skeleton variant="text" width="35%" height={14} />
        </Box>
        <Skeleton variant="rounded" width={58} height={22} />
      </Stack>
      <Skeleton variant="rounded" height={6} sx={{ mt: 1.5, borderRadius: 3 }} />
    </Box>
  );
}
