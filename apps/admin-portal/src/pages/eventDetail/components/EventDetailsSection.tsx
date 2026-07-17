import { Box, Divider, Paper, Stack, Typography } from '@sinnapi/ui';
import { formatDate, formatMoney, titleize } from '@/lib/config';
import type { EventDetailModel, OwnerRef } from '@/lib/types';

type Props = {
  event: EventDetailModel;
  poster: OwnerRef | null;
};

/** One label/value pair. Values fall back to an em-dash when absent. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.25, fontWeight: 500 }}>
        {children ?? '—'}
      </Typography>
    </Box>
  );
}

function budgetText(e: EventDetailModel): string {
  const cur = e.currency ?? 'UGX';
  if (e.budget_min == null && e.budget_max == null) return '—';
  if (e.budget_min != null && e.budget_max != null) {
    return `${formatMoney(e.budget_min, cur)} – ${formatMoney(e.budget_max, cur)}`;
  }
  return formatMoney(e.budget_min ?? e.budget_max, cur);
}

/** The event's full attributes, laid out as a responsive definition grid. */
export default function EventDetailsSection({ event: e, poster }: Props) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      {e.cover_image_url && (
        <Box
          component="img"
          src={e.cover_image_url}
          alt=""
          sx={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }}
        />
      )}

      <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
          About this event
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
          {e.description?.trim() || 'No description provided.'}
        </Typography>

        <Divider sx={{ my: 2.5 }} />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
            gap: 2.5,
          }}
        >
          <Field label="Event type">{e.event_type ? titleize(e.event_type) : '—'}</Field>
          <Field label="Date">{e.event_date ? formatDate(e.event_date) : '—'}</Field>
          <Field label="Location">{e.location || '—'}</Field>
          <Field label="Budget">{budgetText(e)}</Field>
          <Field label="Visibility">{e.is_public ? 'Public' : 'Not public'}</Field>
          <Field label="Source">{titleize(e.source)}</Field>
          <Field label="Posted by">{poster?.full_name || poster?.email || '—'}</Field>
          <Field label="Created">{formatDate(e.created_at)}</Field>
        </Box>
      </Box>

      {(poster?.email || poster?.phone) && (
        <>
          <Divider />
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 0.5, sm: 3 }}
            sx={{ px: { xs: 2.5, sm: 3 }, py: 2, bgcolor: 'action.hover' }}
          >
            {poster?.email && (
              <Typography variant="body2" color="text.secondary">
                {poster.email}
              </Typography>
            )}
            {poster?.phone && (
              <Typography variant="body2" color="text.secondary">
                {poster.phone}
              </Typography>
            )}
          </Stack>
        </>
      )}
    </Paper>
  );
}
