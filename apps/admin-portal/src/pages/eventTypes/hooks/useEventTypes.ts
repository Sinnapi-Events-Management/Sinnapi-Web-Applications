import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTableState, type PageFilters } from '@sinnapi/ui';
import { useEventTypesAdmin, useNextEventTypeSortOrder } from '@/hooks/queries';
import { useSearchTerm } from '@/hooks/useSearchTerm';
import { supabase } from '@/lib/supabase';
import type { EventTypeModel } from '@/lib/types';
import { useEventTypeEdit } from './useEventTypeEdit';
import { useEventTypeDelete } from './useEventTypeDelete';

/**
 * Event-types list coordinator: the server-paginated vocabulary plus the
 * toolbar filters and the create/edit/delete flows. Each concern owns its state
 * in a smaller hook; this stays a thin composer that only shapes the params.
 */
export function useEventTypes() {
  const qc = useQueryClient();
  const table = useTableState({ sort: { field: 'sort_order', direction: 'asc' } });
  const { onPageChange } = table.controls;
  const resetPage = useCallback(() => onPageChange(0), [onPageChange]);

  const search = useSearchTerm({ onChange: resetPage });
  const [active, setActiveState] = useState('');
  const setActive = useCallback(
    (v: string) => {
      setActiveState(v);
      resetPage();
    },
    [resetPage],
  );
  const resetFilters = useCallback(() => {
    setActiveState('');
    search.clear();
    resetPage();
  }, [resetPage, search]);

  const filters = useMemo<PageFilters>(
    () => ({ is_active: active || undefined, search: search.query }),
    [active, search.query],
  );
  const params = useMemo(() => ({ ...table.params, filters }), [table.params, filters]);

  const { data, isLoading, isFetching, error } = useEventTypesAdmin(params);
  const { data: nextSortOrder } = useNextEventTypeSortOrder();

  const edit = useEventTypeEdit();
  const remove = useEventTypeDelete();

  /**
   * Deactivating is the safe alternative to deleting: events already filed
   * under the type keep it, but it disappears from every picker and from the
   * public site's occasion filter.
   */
  const toggleActive = useCallback(
    async (eventType: EventTypeModel, isActive: boolean) => {
      await supabase.from('event_types').update({ is_active: isActive }).eq('id', eventType.id);
      qc.invalidateQueries({ queryKey: ['admin-event-types'] });
      qc.invalidateQueries({ queryKey: ['event-type-options'] });
    },
    [qc],
  );

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    filters: {
      search,
      active,
      setActive,
      reset: resetFilters,
      isActive: Boolean(search.query) || Boolean(active),
    },
    nextSortOrder: nextSortOrder ?? 0,
    edit,
    remove,
    toggleActive,
    table,
  };
}

export type EventTypeFiltersState = ReturnType<typeof useEventTypes>['filters'];
