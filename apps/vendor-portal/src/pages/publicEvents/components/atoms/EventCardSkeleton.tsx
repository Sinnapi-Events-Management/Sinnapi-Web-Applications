import { Card, CardContent, Box, Skeleton, Divider } from '@sinnapi/ui';
import { COVER_HEIGHT } from './EventCoverMedia';

/**
 * Placeholder in the shape of a `PublicEventCard` — media band, chip row,
 * title, meta line, description and the footer's value/action split.
 *
 * It mirrors the real card's structure rather than approximating it, and takes
 * the media height from the same constant the card does: the whole point of a
 * skeleton is that nothing moves when the data lands, and a placeholder that
 * is short by a media band guarantees the opposite.
 */
export default function EventCardSkeleton() {
  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Skeleton variant="rectangular" height={COVER_HEIGHT} sx={{ flexShrink: 0 }} />
      <CardContent sx={{ flex: 1 }}>
        <Skeleton width={96} height={24} sx={{ mb: 1 }} />
        <Skeleton width="80%" height={28} />
        <Skeleton width="60%" sx={{ mt: 1 }} />
        <Skeleton width="95%" sx={{ mt: 1.5 }} />
        <Skeleton width="70%" />
      </CardContent>
      <Divider />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Skeleton width="45%" height={24} />
        <Skeleton width={120} height={36} sx={{ ml: 'auto', borderRadius: 1 }} />
      </Box>
    </Card>
  );
}
