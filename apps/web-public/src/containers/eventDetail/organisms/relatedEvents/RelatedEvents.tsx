import { Box, Container, Grid, Typography } from '@sinnapi/ui';
import EventCard from '@/components/molecules/eventCard';
import { mutedSurface } from '@/lib/sx';
import type { EventCardModel } from '@/lib/types';

/**
 * "More events like this" rail. Reuses the listing's EventCard + ScrollReveal so
 * the cards look and animate identically across the site. Renders nothing when
 * there are no related events, keeping the detail page clean.
 */
export default function RelatedEvents({ events }: { events: EventCardModel[] }) {
  if (events.length === 0) return null;

  return (
    <Box sx={{ ...mutedSurface, py: { xs: 6, md: 9 } }}>
      <Container>
        <Typography variant="overline" color="primary">
          Keep exploring
        </Typography>
        <Typography variant="h4" sx={{ mt: 0.5, mb: 4 }}>
          More events like this
        </Typography>
        <Grid container spacing={3}>
          {events.map((event, i) => (
            <Grid item xs={12} sm={6} md={4} key={event.id}>
              <EventCard event={event} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
