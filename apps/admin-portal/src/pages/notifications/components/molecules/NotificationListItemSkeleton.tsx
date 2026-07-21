import { Box, Stack, Skeleton } from '@sinnapi/ui';

/** Placeholder mirroring <NotificationListItem /> so the feed doesn't jump on load. */
export default function NotificationListItemSkeleton() {
  return (
    <Box sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: 'divider', borderLeftWidth: 3 }}>
      <Stack direction="row" spacing={1.5}>
        <Skeleton variant="circular" width={40} height={40} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Skeleton variant="text" width="50%" />
            <Box sx={{ flex: 1 }} />
            <Skeleton variant="text" width={44} />
          </Stack>
          <Skeleton variant="text" width="85%" />
          <Skeleton variant="rounded" width={72} height={20} sx={{ mt: 0.75 }} />
        </Box>
      </Stack>
    </Box>
  );
}
