import { Card, CardContent, Typography, Stack, Chip } from '@sinnapi/ui';
import { formatMoney } from '@/lib/config';
import type { ServiceModel } from '@/lib/types';

/** One service in the vendor's catalogue. */
export default function ServiceCard({ service }: { service: ServiceModel }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6">{service.title}</Typography>
          <Chip
            size="small"
            label={service.is_active ? 'Active' : 'Hidden'}
            color={service.is_active ? 'success' : 'default'}
          />
        </Stack>
        {service.description && (
          <Typography variant="body2" color="text.secondary">
            {service.description}
          </Typography>
        )}
        {service.base_price != null && (
          <Typography sx={{ mt: 1 }} fontWeight={600}>
            {formatMoney(service.base_price, service.currency)}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
