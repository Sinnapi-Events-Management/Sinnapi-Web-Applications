import { Card, CardContent, Typography, Stack, Chip, Box } from '@sinnapi/ui';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import PaymentsIcon from '@mui/icons-material/Payments';
import ExpressInterestButton from '@/components/events/ExpressInterestButton';
import { formatDate, formatMoney } from '@/lib/config';
import type { PublicEventModel } from '@/lib/types';

type PublicEventCardProps = {
  event: PublicEventModel;
  vendorId: string;
  /** Whether this vendor has already expressed interest. */
  interested: boolean;
};

/**
 * Renders the stated budget as a range, a floor, or a ceiling depending on what
 * the poster actually filled in. Returning null rather than a placeholder keeps
 * the row off the card entirely — "Budget: —" is noise on a brief that simply
 * doesn't quote one.
 */
function budgetLabel(event: PublicEventModel): string | null {
  const { budget_min: min, budget_max: max, currency } = event;
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) {
    return `${formatMoney(min, currency)} – ${formatMoney(max, currency)}`;
  }
  if (min != null && max != null) return formatMoney(min, currency);
  if (min != null) return `From ${formatMoney(min, currency)}`;
  return `Up to ${formatMoney(max, currency)}`;
}

/**
 * One public event, as a vendor sees it: what the occasion is, when and where,
 * what it's budgeted at, and — for client-posted events only — the one action
 * available on it.
 *
 * Admin-sourced events are inspiration and take no interest, so the card says
 * so in place of the button rather than showing a disabled control the vendor
 * would keep trying to press.
 */
export default function PublicEventCard({ event, vendorId, interested }: PublicEventCardProps) {
  const budget = budgetLabel(event);

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
          {/* The RPC returns the occasion's own display name, so there is no
              token left to titleize — the chip reads what the admin named it. */}
          {event.event_type_name && <Chip size="small" label={event.event_type_name} />}
          <Chip
            size="small"
            variant="outlined"
            label={event.source === 'admin' ? 'Inspiration' : 'Open event'}
          />
        </Stack>

        <Typography variant="h6">{event.title}</Typography>

        <Stack
          direction="row"
          spacing={2}
          useFlexGap
          flexWrap="wrap"
          sx={{ color: 'text.secondary', mt: 0.5 }}
        >
          {event.event_date && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <EventIcon fontSize="inherit" />
              <Typography variant="body2">{formatDate(event.event_date)}</Typography>
            </Stack>
          )}
          {event.location && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <PlaceIcon fontSize="inherit" />
              <Typography variant="body2">{event.location}</Typography>
            </Stack>
          )}
          {budget && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <PaymentsIcon fontSize="inherit" />
              <Typography variant="body2">{budget}</Typography>
            </Stack>
          )}
        </Stack>

        {event.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {event.description}
          </Typography>
        )}
      </CardContent>

      <Box sx={{ p: 2, pt: 0 }}>
        {event.source === 'client' ? (
          <ExpressInterestButton eventId={event.id} vendorId={vendorId} already={interested} />
        ) : (
          <Typography variant="caption" color="text.secondary">
            Inspiration only
          </Typography>
        )}
      </Box>
    </Card>
  );
}
