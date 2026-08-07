import { Card, Skeleton, Box } from '@sinnapi/ui';

/**
 * Placeholder in the shape of a VendorCard. Sized to the real card (160px
 * media, then three text rows) so the first paint doesn't reflow the grid the
 * moment data lands.
 */
export default function VendorCardSkeleton() {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <Skeleton variant="rectangular" height={160} />
      <Box sx={{ p: 2 }}>
        <Skeleton width="70%" />
        <Skeleton width="40%" />
        <Skeleton width="55%" />
      </Box>
    </Card>
  );
}
