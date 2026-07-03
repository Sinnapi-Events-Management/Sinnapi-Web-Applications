import type { ReactNode } from 'react';
import { Grid, Paper } from '@sinnapi/ui/atoms';
import { Event as EventIcon, Place as PlaceIcon, Payments, LocalOffer } from '@mui/icons-material';
import { titleize } from '@/lib/config/site';
import type { EventCardModel } from '@/lib/types';
import DetailRow from '../eventDetailSidebar/molecules/DetailRow';
import { compactBudgetLabel } from '../../utils/budgetLabel';

type Highlight = { icon: ReactNode; label: string; value: string };

/**
 * Bento-style "at a glance" strip directly under the hero. Surfaces the event's
 * key facts (date, location, budget, occasion) as equal rounded tiles across the
 * full width, so the page leads with scannable data instead of a tall sidebar —
 * the main lever for removing the dead space beside a short description. Tiles
 * render only for facts that exist, and the row keeps its rhythm regardless.
 */
export default function EventDetailHighlights({ event }: { event: EventCardModel }) {
  const budget = compactBudgetLabel(event);

  const highlights: Highlight[] = [
    event.event_date && {
      icon: <EventIcon fontSize="small" />,
      label: 'Date',
      value: new Date(event.event_date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    },
    event.location && {
      icon: <PlaceIcon fontSize="small" />,
      label: 'Location',
      value: titleize(event.location),
    },
    budget && { icon: <Payments fontSize="small" />, label: 'Budget', value: budget },
    event.event_type && {
      icon: <LocalOffer fontSize="small" />,
      label: 'Occasion',
      value: titleize(event.event_type),
    },
  ].filter(Boolean) as Highlight[];

  if (highlights.length === 0) return null;

  return (
    <Grid container spacing={2}>
      {highlights.map((highlight) => (
        <Grid item xs={12} sm={6} md={3} key={highlight.label}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              height: '100%',
              borderRadius: 3,
              transition: 'box-shadow .2s ease, border-color .2s ease, transform .2s ease',
              '&:hover': {
                boxShadow: 3,
                borderColor: 'primary.main',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <DetailRow icon={highlight.icon} label={highlight.label} value={highlight.value} />
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
