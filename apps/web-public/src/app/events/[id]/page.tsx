import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import NextLink from 'next/link';
import { Container, Box, Typography, Chip, Stack, Button, Alert, Paper } from '@sinnapi/ui';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import { getEventById } from '@/lib/queries';
import { titleize, SITE } from '@/lib/config/site';

export const revalidate = 1800;

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const event = await getEventById(params.id);
  if (!event) return { title: 'Event not found' };
  return {
    title: event.title,
    description: event.description?.slice(0, 155) ?? `${event.title} on Sinnapi.`,
    alternates: { canonical: `/events/${event.id}` },
  };
}

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const event = await getEventById(params.id);
  if (!event) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description ?? undefined,
    startDate: event.event_date ?? undefined,
    location: event.location ? { '@type': 'Place', name: event.location } : undefined,
    url: `${SITE.url}/events/${event.id}`,
  };

  return (
    <Container sx={{ py: { xs: 4, md: 6 }, maxWidth: 880 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {event.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.cover_image_url}
          alt={event.title}
          style={{ width: '100%', borderRadius: 12, marginBottom: 24 }}
        />
      )}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        {event.event_type && <Chip label={titleize(event.event_type)} />}
        <Chip variant="outlined" label={event.source === 'admin' ? 'Inspiration' : 'Open event'} />
      </Stack>
      <Typography variant="h1" sx={{ fontSize: { xs: '2rem', md: '2.5rem' } }}>
        {event.title}
      </Typography>
      <Stack direction="row" spacing={2} sx={{ mt: 2, color: 'text.secondary' }}>
        {event.event_date && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <EventIcon fontSize="small" />
            <Typography>{new Date(event.event_date).toLocaleDateString()}</Typography>
          </Stack>
        )}
        {event.location && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <PlaceIcon fontSize="small" />
            <Typography>{event.location}</Typography>
          </Stack>
        )}
      </Stack>
      {event.description && (
        <Typography sx={{ mt: 3 }} color="text.secondary">
          {event.description}
        </Typography>
      )}

      {event.source === 'client' && (
        <Paper variant="outlined" sx={{ p: 3, mt: 4 }}>
          <Typography variant="h5">Are you a vendor?</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Sign in to express interest in this event.
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
            <Button component={NextLink} href="/sign-in" variant="contained">
              Express interest
            </Button>
            <Button component={NextLink} href="/apply" variant="outlined">
              Become a vendor
            </Button>
          </Stack>
          <Alert severity="info" sx={{ mt: 2 }}>
            Only approved vendors with an active subscription can express interest.
          </Alert>
        </Paper>
      )}
    </Container>
  );
}
