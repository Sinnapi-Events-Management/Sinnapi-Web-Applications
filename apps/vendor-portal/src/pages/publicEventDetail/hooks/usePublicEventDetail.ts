import { useParams } from 'react-router-dom';
import { useBreadcrumbTitle } from '@sinnapi/ui/router';
import { usePublicEvent } from '@/hooks/queries';
import { one } from '@/lib/rel';
import type { EventTypeRef } from '@/lib/types';

/**
 * The event itself, and whether there is one.
 *
 * `notFound` is separated from `error` because they are different answers to a
 * vendor. `events_public_read` stops matching the moment a client unpublishes,
 * privatises or deletes a brief, so the row simply disappears — that is a
 * withdrawn event, not a failure, and the page says so. A thrown PostgREST
 * error is a failure and keeps the error state, so a vendor is never told their
 * brief was pulled when the truth was a dropped connection.
 */
export function usePublicEventDetail() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = usePublicEvent(id);

  // Named in the breadcrumb by the client's own title. Undefined while loading
  // leaves the crumb on its route label rather than flashing a placeholder.
  useBreadcrumbTitle(data?.title ?? undefined);

  return {
    id,
    event: data ?? null,
    /** The occasion, normalised out of PostgREST's to-one embed. */
    eventType: one<EventTypeRef>(data?.event_types ?? null),
    notFound: !isLoading && !error && !data,
    isLoading,
    error,
  };
}
