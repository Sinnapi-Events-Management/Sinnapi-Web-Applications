import { Card, CardContent, Chip, Skeleton, Stack, Typography } from '@sinnapi/ui';
import type { DeliveryRow } from '@sinnapi/ui/documents';
import { formatDateTime } from '@/lib/config';

type Props = { deliveries: DeliveryRow[]; loading: boolean };

const STATUS: Record<
  DeliveryRow['status'],
  { label: string; color: 'success' | 'error' | 'default' }
> = {
  sent: { label: 'Sent', color: 'success' },
  failed: { label: 'Failed', color: 'error' },
  sending: { label: 'Sending', color: 'default' },
};

/**
 * Every time this document was emailed, newest first. A registered client's
 * address shows masked (`s***@gmail.com`): vendors are not shown client
 * emails, and the history never stored the real one.
 */
export default function DeliveryHistory({ deliveries, loading }: Props) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" component="h2" fontWeight={700}>
            Email history
          </Typography>
          {loading && <Skeleton variant="rounded" height={48} />}
          {!loading && deliveries.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Not emailed yet.
            </Typography>
          )}
          {deliveries.map((d) => (
            <Stack key={d.id} spacing={0.25}>
              <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
                <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                  {d.recipient_kind === 'client_account'
                    ? `Sinnapi account (${d.recipient_display})`
                    : d.recipient_kind === 'self'
                      ? `You (${d.recipient_display})`
                      : d.recipient_display}
                </Typography>
                <Chip
                  size="small"
                  label={STATUS[d.status].label}
                  color={STATUS[d.status].color}
                  variant="outlined"
                />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {formatDateTime(d.sent_at ?? d.created_at)}
                {d.status === 'failed' && d.error ? ` — ${d.error}` : ''}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
