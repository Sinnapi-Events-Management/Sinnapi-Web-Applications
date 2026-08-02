import { Card, CardContent, Typography, Stack, Chip } from '@sinnapi/ui';
import { formatDate } from '@/lib/config';
import type { PromotionModel } from '@/lib/types';

/** One promotion and the window it runs in. */
export default function PromotionCard({ promotion }: { promotion: PromotionModel }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{promotion.title}</Typography>
          <Chip
            size="small"
            label={promotion.is_active ? 'Active' : 'Inactive'}
            color={promotion.is_active ? 'success' : 'default'}
          />
        </Stack>
        {promotion.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {promotion.description}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {formatDate(promotion.starts_at)} – {formatDate(promotion.ends_at)}
        </Typography>
      </CardContent>
    </Card>
  );
}
