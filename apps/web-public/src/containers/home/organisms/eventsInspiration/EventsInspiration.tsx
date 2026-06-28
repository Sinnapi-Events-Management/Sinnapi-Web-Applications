import NextLink from 'next/link';
import { Box, Container, Grid, Stack, Typography, Button } from '@sinnapi/ui';
import { ArrowForward } from '@sinnapi/ui/icons';
import EventCard from '@/components/molecules/eventCard';
import type { EventCardModel } from '@/lib/types';

export default function EventsInspiration({ events }: { events: EventCardModel[] }) {
  if (events.length === 0) return null;
  return (
    <Container sx={{ py: { xs: 6, md: 9 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography variant="overline" color="primary">
            Get inspired
          </Typography>
          <Typography variant="h2" sx={{ mt: 0.5 }}>
            Events & inspiration
          </Typography>
        </Box>
        <Button component={NextLink} href="/events" variant="outlined" endIcon={<ArrowForward />}>
          See all events
        </Button>
      </Stack>
      <Grid container spacing={3}>
        {events.map((e) => (
          <Grid item xs={12} sm={6} md={4} key={e.id}>
            <EventCard event={e} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
