import { Alert } from '@sinnapi/ui';
import QueryState from '@/components/ui/QueryState';
import EmptyState from '@/components/ui/EmptyState';
import { useEventDetail } from './hooks/useEventDetail';
import EventHero from './components/EventHero';
import EventStats from './components/EventStats';
import EventTabs from './components/EventTabs';
import EventEditDrawer from '../events/components/organisms/EventEditDrawer';
import EventStatusDialog from '../events/components/organisms/EventStatusDialog';
import EventDeleteDialog from '../events/components/organisms/EventDeleteDialog';

export default function EventDetail() {
  const { event, poster, kpis, isLoading, error, edit, status, remove } = useEventDetail();

  const actionError = status.err ?? remove.err;

  return (
    <QueryState isLoading={isLoading} error={error}>
      {!event ? (
        <EmptyState title="Event not found" ctaLabel="Back to events" ctaHref="/events" />
      ) : (
        <>
          <EventHero
            event={event}
            onEdit={() => edit.open(event)}
            onRequestStatusChange={(next) => status.request(event, next)}
            onRequestDelete={() => remove.request(event)}
          />

          {actionError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {actionError}
            </Alert>
          )}

          <EventStats kpis={kpis} />

          <EventTabs event={event} poster={poster} />

          <EventEditDrawer
            open={edit.isOpen}
            event={edit.event}
            loading={edit.loading}
            loadError={edit.loadError}
            busy={edit.busy}
            err={edit.err}
            onClose={edit.close}
            onSave={edit.save}
          />

          <EventStatusDialog
            pending={status.pending}
            busy={status.busy}
            onCancel={status.cancel}
            onConfirm={status.confirm}
          />

          <EventDeleteDialog
            pending={remove.pending}
            busy={remove.busy}
            onCancel={remove.cancel}
            onConfirm={remove.confirm}
          />
        </>
      )}
    </QueryState>
  );
}
