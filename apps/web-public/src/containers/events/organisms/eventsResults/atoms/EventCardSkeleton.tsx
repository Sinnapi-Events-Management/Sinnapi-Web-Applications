import { Box, Skeleton } from '@sinnapi/ui/atoms';
import { Card, CardContent } from '@sinnapi/ui/molecules';

/**
 * Placeholder for one event card. Mirrors the real card's structure — 190px
 * cover, occasion chip, two-line title, teaser, then the date/location/budget
 * meta row — so the grid doesn't reflow when data lands. Decorative, so it's
 * hidden from assistive tech; the toolbar's live region announces loading.
 */
export default function EventCardSkeleton() {
  return (
    <Card variant="outlined" aria-hidden sx={{ height: '100%' }}>
      <Skeleton variant="rectangular" height={190} />
      <CardContent>
        <Skeleton variant="rounded" width={84} height={24} />
        <Skeleton variant="text" width="80%" height={28} sx={{ mt: 1 }} />
        <Skeleton variant="text" width="95%" />
        <Skeleton variant="text" width="60%" />
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Skeleton variant="text" width={88} />
          <Skeleton variant="text" width={72} />
        </Box>
        <Skeleton variant="text" width="45%" />
      </CardContent>
    </Card>
  );
}
