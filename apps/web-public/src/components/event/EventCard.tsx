import NextLink from 'next/link';
import { Card, CardActionArea, CardContent, CardMedia, Typography, Chip, Stack } from '@sinnapi/ui';
import EventIcon from '@mui/icons-material/Event';
import { titleize } from '@/lib/config/site';
import type { EventCardModel } from '@/lib/types';

export default function EventCard({ event }: { event: EventCardModel }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardActionArea component={NextLink} href={`/events/${event.id}`} sx={{ height: '100%' }}>
        <CardMedia
          component="img"
          height="160"
          image={event.cover_image_url ?? '/placeholder-event.svg'}
          alt={event.title}
          sx={{ bgcolor: 'grey.100' }}
        />
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            {event.event_type && <Chip size="small" label={titleize(event.event_type)} />}
            <Chip
              size="small"
              variant="outlined"
              label={event.source === 'admin' ? 'Inspiration' : 'Open event'}
            />
          </Stack>
          <Typography variant="h6" noWrap>
            {event.title}
          </Typography>
          {event.event_date && (
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              sx={{ color: 'text.secondary', mt: 0.5 }}
            >
              <EventIcon fontSize="inherit" />
              <Typography variant="body2">
                {new Date(event.event_date).toLocaleDateString()}
              </Typography>
            </Stack>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
