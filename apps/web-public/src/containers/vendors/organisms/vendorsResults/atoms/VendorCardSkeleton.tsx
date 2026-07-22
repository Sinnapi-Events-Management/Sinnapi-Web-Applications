import { Box, Skeleton } from '@sinnapi/ui/atoms';
import { Card, CardContent } from '@sinnapi/ui/molecules';

/**
 * Placeholder for one vendor card. Mirrors the real card's structure — 180px
 * cover, title, location, chips, rating, price — so the grid doesn't reflow
 * when data lands. Decorative, so it's hidden from assistive tech; the grid's
 * live region announces loading instead.
 */
export default function VendorCardSkeleton() {
  return (
    <Card variant="outlined" aria-hidden sx={{ height: '100%' }}>
      <Skeleton variant="rectangular" height={180} />
      <CardContent>
        <Skeleton variant="text" width="70%" height={28} />
        <Skeleton variant="text" width="45%" />
        <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
          <Skeleton variant="rounded" width={72} height={24} />
          <Skeleton variant="rounded" width={56} height={24} />
        </Box>
        <Skeleton variant="text" width="55%" sx={{ mt: 1 }} />
        <Skeleton variant="text" width="40%" />
      </CardContent>
    </Card>
  );
}
