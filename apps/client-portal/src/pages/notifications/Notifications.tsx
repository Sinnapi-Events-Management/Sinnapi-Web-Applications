import { Card, List, ListItem, ListItemText, Divider, Button } from '@sinnapi/ui';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import QueryState from '@/components/ui/QueryState';
import { formatDate, titleize } from '@/lib/config';
import { useNotifications } from './hooks/useNotifications';

export default function Notifications() {
  const { rows, isLoading, error, busy, markAll } = useNotifications();

  return (
    <>
      <PageTitle
        title="Notifications"
        action={
          rows.length > 0 ? (
            <Button
              onClick={markAll}
              disabled={busy}
              startIcon={<DoneAllIcon />}
              variant="outlined"
            >
              Mark all read
            </Button>
          ) : undefined
        }
      />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState
            title="You're all caught up"
            description="Notifications about bookings, quotes, and payments appear here."
          />
        ) : (
          <Card variant="outlined">
            <List disablePadding>
              {rows.map((n, i) => (
                <div key={n.id}>
                  {i > 0 && <Divider />}
                  <ListItem sx={{ bgcolor: n.read_at ? 'transparent' : 'action.hover' }}>
                    {!n.read_at && (
                      <FiberManualRecordIcon color="primary" sx={{ fontSize: 10, mr: 1 }} />
                    )}
                    <ListItemText
                      primary={n.title || titleize(n.trigger_key)}
                      secondary={`${n.body ? `${n.body} · ` : ''}${formatDate(n.created_at)}`}
                    />
                  </ListItem>
                </div>
              ))}
            </List>
          </Card>
        )}
      </QueryState>
    </>
  );
}
