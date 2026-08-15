import { Button, PageTitle, QueryState } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import AddIcon from '@mui/icons-material/Add';
import { useMyEvents } from './hooks/useMyEvents';
import { useEventCreate } from './hooks/useEventCreate';
import MyEventsGrid from './components/organisms/MyEventsGrid';
import EventCreateDrawer from './components/organisms/EventCreateDrawer';

export default function MyEvents() {
  const { rows, isLoading, error } = useMyEvents();
  const create = useEventCreate();

  return (
    <>
      <PageTitle
        title="My Events"
        subtitle="Events you've posted for vendors to bid on."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={create.open}>
            Post an event
          </Button>
        }
      />

      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState
            title="No events posted"
            description="Post an event so vendors can express interest."
          />
        ) : (
          <MyEventsGrid events={rows} />
        )}
      </QueryState>

      {/* Outside QueryState on purpose: posting stays available while the list
          is still loading or has failed to load. */}
      <EventCreateDrawer
        open={create.isOpen}
        busy={create.busy}
        err={create.err}
        onClose={create.close}
        onSave={create.save}
      />
    </>
  );
}
