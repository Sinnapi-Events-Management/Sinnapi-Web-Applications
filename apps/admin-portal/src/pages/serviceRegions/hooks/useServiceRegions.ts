import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServiceRegionsAdmin, useNextServiceRegionSortOrder } from '@/hooks/queries';
import { useTableState } from '@/hooks/useTableState';
import { useSearchTerm } from '@/hooks/useSearchTerm';
import { supabase } from '@/lib/supabase';
import type { PageFilters } from '@/lib/table';
import type { ServiceRegionModel } from '@/lib/types';
import { useRegionEdit } from './useRegionEdit';
import { useRegionDelete } from './useRegionDelete';

/**
 * Regions list coordinator: server-paginated catalogue plus the toolbar
 * filters and the create/edit/delete flows. Each concern owns its own state in
 * a smaller hook; this stays a thin composer that only shapes the query params.
 */
export function useServiceRegions() {
  const qc = useQueryClient();
  const table = useTableState({ sort: { field: 'sort_order', direction: 'asc' } });
  const { onPageChange } = table.controls;
  const resetPage = useCallback(() => onPageChange(0), [onPageChange]);

  const search = useSearchTerm({ onChange: resetPage });
  const [scope, setScopeState] = useState('');
  const [active, setActiveState] = useState('');

  const setScope = useCallback(
    (v: string) => {
      setScopeState(v);
      resetPage();
    },
    [resetPage],
  );
  const setActive = useCallback(
    (v: string) => {
      setActiveState(v);
      resetPage();
    },
    [resetPage],
  );
  const resetFilters = useCallback(() => {
    setScopeState('');
    setActiveState('');
    search.clear();
    resetPage();
  }, [resetPage, search]);

  const filters = useMemo<PageFilters>(
    () => ({ scope: scope || undefined, is_active: active || undefined, search: search.query }),
    [scope, active, search.query],
  );
  const params = useMemo(() => ({ ...table.params, filters }), [table.params, filters]);

  const { data, isLoading, isFetching, error } = useServiceRegionsAdmin(params);
  const { data: nextSortOrder } = useNextServiceRegionSortOrder();

  const edit = useRegionEdit();
  const remove = useRegionDelete();

  const toggleActive = useCallback(
    async (region: ServiceRegionModel, isActive: boolean) => {
      await supabase.from('service_regions').update({ is_active: isActive }).eq('id', region.id);
      qc.invalidateQueries({ queryKey: ['admin-service-regions'] });
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
      scope,
      setScope,
      active,
      setActive,
      reset: resetFilters,
      isActive: Boolean(search.query) || Boolean(scope) || Boolean(active),
    },
    nextSortOrder: nextSortOrder ?? 0,
    edit,
    remove,
    toggleActive,
    table,
  };
}

export type RegionFiltersState = ReturnType<typeof useServiceRegions>['filters'];
