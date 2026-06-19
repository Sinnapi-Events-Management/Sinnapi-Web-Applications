import { Link as RouterLink } from 'react-router-dom';
import { Grid, Card, CardContent, Typography, Button, Stack, Chip } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import { useMyEvents } from '@/hooks/queries';
import { formatDate, titleize } from '@/lib/config';

export default function MyEvents() {
  const { data, isLoading, error } = useMyEvents();
  const rows = data ?? [];
  const action = (
    <Button component={RouterLink} to="/my-events/new" variant="contained" startIcon={<AddIcon />}>
      Post an event
    </Button>
  );

  return (
    <>
      <PageTitle
        title="My Events"
        subtitle="Events you've posted for vendors to bid on."
        action={action}
      />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState
            title="No events posted"
            description="Post an event so vendors can express interest."
          />
        ) : (
          <Grid container spacing={3}>
            {rows.map((e) => (
              <Grid item xs={12} sm={6} md={4} key={e.id}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 1 }}
                    >
                      {e.event_type ? (
                        <Chip size="small" label={titleize(e.event_type)} />
                      ) : (
                        <span />
                      )}
                      <StatusChip status={e.status} />
                    </Stack>
                    <Typography variant="h6">{e.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(e.event_date)} · {e.location ?? '—'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </QueryState>
    </>
  );
}
