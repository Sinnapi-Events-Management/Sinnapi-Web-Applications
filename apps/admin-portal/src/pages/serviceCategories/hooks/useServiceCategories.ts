import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useServiceCategoriesAdmin,
  useServiceCategoryOptions,
  useNextServiceCategorySortOrder,
} from '@/hooks/queries';
import { useTableState } from '@sinnapi/ui';
import { useSearchTerm } from '@/hooks/useSearchTerm';
import { supabase } from '@/lib/supabase';
import type { PageFilters } from '@sinnapi/ui';
import type { ServiceCategoryModel } from '@/lib/types';
import { useCategoryEdit } from './useCategoryEdit';
import { useCategoryDelete } from './useCategoryDelete';

/**
 * Categories list coordinator: server-paginated catalogue plus the toolbar
 * filters and the create/edit/delete flows. Each concern owns its own state in
 * a smaller hook; this stays a thin composer that only shapes the query params.
 */
export function useServiceCategories() {
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

  const { data, isLoading, isFetching, error } = useServiceCategoriesAdmin(params);
  const { data: allCategories } = useServiceCategoryOptions();
  const { data: nextSortOrder } = useNextServiceCategorySortOrder();

  const edit = useCategoryEdit();
  const remove = useCategoryDelete();

  // A category can't be its own parent — exclude it from the select while editing.
  const parentOptions = useMemo(
    () =>
      (allCategories ?? [])
        .filter((c) => c.id !== edit.category?.id)
        .map((c) => ({ value: c.id, label: c.name })),
    [allCategories, edit.category?.id],
  );

  const toggleActive = useCallback(
    async (category: ServiceCategoryModel, isActive: boolean) => {
      await supabase
        .from('service_categories')
        .update({ is_active: isActive })
        .eq('id', category.id);
      qc.invalidateQueries({ queryKey: ['admin-service-categories'] });
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
    parentOptions,
    nextSortOrder: nextSortOrder ?? 0,
    edit,
    remove,
    toggleActive,
    table,
  };
}

export type CategoryFiltersState = ReturnType<typeof useServiceCategories>['filters'];
