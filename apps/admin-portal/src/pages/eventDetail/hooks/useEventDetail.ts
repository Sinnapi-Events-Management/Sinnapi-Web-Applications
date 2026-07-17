import { useNavigate, useParams } from 'react-router-dom';
import { useEvent, useEventEngagementKpis } from '@/hooks/queries';
import type { OwnerRef } from '@/lib/types';
import { useEventEdit } from '../../events/hooks/useEventEdit';
import { useEventStatus } from '../../events/hooks/useEventStatus';
import { useEventDelete } from '../../events/hooks/useEventDelete';

/** Supabase embeds a to-one relation as an object or a single-item array. */
function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * Detail view for a single event. Reuses the exact edit / status / delete flows
 * the list uses, so both entry points behave identically. Editing opens the same
 * drawer (its `useEvent(id)` hits the already-cached record), and a delete routes
 * back to the list since the record is gone.
 */
export function useEventDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const { data: event, isLoading, error } = useEvent(id);
  const { data: kpis } = useEventEngagementKpis(id);
  const poster = firstOf<OwnerRef>(event?.poster);

  const edit = useEventEdit();
  const status = useEventStatus();
  const remove = useEventDelete({ onDeleted: () => navigate('/events') });

  return {
    id,
    event: event ?? null,
    poster,
    kpis,
    isLoading,
    error,
    edit,
    status,
    remove,
    navigate,
  };
}
