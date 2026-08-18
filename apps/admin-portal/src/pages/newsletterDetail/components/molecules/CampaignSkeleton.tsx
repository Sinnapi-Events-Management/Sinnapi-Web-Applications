import { Skeleton, Stack } from '@sinnapi/ui';

/**
 * The composer while its campaign loads.
 *
 * Shaped like the header and the panel that replace it, so the screen settles
 * into place instead of jumping when the query lands.
 */
export default function CampaignSkeleton() {
  return (
    <Stack spacing={2}>
      <Skeleton variant="rounded" height={72} />
      <Skeleton variant="rounded" height={340} />
    </Stack>
  );
}
