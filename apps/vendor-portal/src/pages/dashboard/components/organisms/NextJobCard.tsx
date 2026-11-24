import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardActionArea, Skeleton, Stack, Typography } from '@sinnapi/ui';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { formatDate } from '@/lib/config';
import type { UpcomingModel } from '@/data/overview';

type Props = { next: UpcomingModel | undefined; more: number; isLoading: boolean };

/** The next booked job — when, who, where — or a calm line when there is none. */
export default function NextJobCard({ next, more, isLoading }: Props) {
  return (
    <Box component="section" aria-labelledby="next-job-title" sx={{ mb: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography id="next-job-title" variant="h6" component="h2" fontWeight={700}>
          Your next job
        </Typography>
        <Button component={RouterLink} to="/calendar" size="small">
          Calendar
        </Button>
      </Stack>
      {isLoading ? (
        <Skeleton variant="rounded" height={84} />
      ) : !next ? (
        <Card variant="outlined" sx={{ p: 2 }}>
          <Typography color="text.secondary">
            No booked jobs coming up yet. Answer your requests to fill your calendar.
          </Typography>
        </Card>
      ) : (
        <Card variant="outlined">
          <CardActionArea
            component={RouterLink}
            to={next.to}
            sx={{ p: 2, display: 'flex', gap: 2, justifyContent: 'flex-start' }}
          >
            <CalendarMonthIcon color="secondary" sx={{ fontSize: 32 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={700}>
                {formatDate(next.eventDate)} · {next.countdown}
              </Typography>
              <Typography color="text.secondary" noWrap>
                {[next.clientName, next.location].filter(Boolean).join(' · ')}
              </Typography>
              {more > 0 && (
                <Typography variant="body2" color="text.secondary">
                  +{more} more coming up
                </Typography>
              )}
            </Box>
          </CardActionArea>
        </Card>
      )}
    </Box>
  );
}
