import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { usePlansAdmin } from '@/hooks/queries';
import { useTableState } from '@/hooks/useTableState';
import type { PageFilters } from '@/lib/table';
import { supabase } from '@/lib/supabase';
import type { PlanModel } from '@/lib/types';
import { usePlanEdit } from './usePlanEdit';
import { usePlanDelete } from './usePlanDelete';

/**
 * Pricing-plans list coordinator: server-paginated catalogue plus the toolbar
 * filters and the create/edit/delete flows. Each concern owns its own state in
 * a smaller hook; this stays a thin composer that only shapes the query params.
 */
export function usePricingPlans() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const table = useTableState({ sort: { field: 'sort_order', direction: 'asc' } });
  const { onPageChange } = table.controls;

  // Filters reset to page 1 — a later page rarely survives the result shrinking.
  const resetPage = useCallback(() => onPageChange(0), [onPageChange]);
  const [cycle, setCycle] = useState('');
  const [active, setActive] = useState('');

  const setCycleFilter = useCallback(
    (v: string) => {
      setCycle(v);
      resetPage();
    },
    [resetPage],
  );
  const setActiveFilter = useCallback(
    (v: string) => {
      setActive(v);
      resetPage();
    },
    [resetPage],
  );
  const resetFilters = useCallback(() => {
    setCycle('');
    setActive('');
    resetPage();
  }, [resetPage]);

  const filters = useMemo<PageFilters>(
    () => ({ billing_cycle: cycle || undefined, is_active: active || undefined }),
    [cycle, active],
  );
  const params = useMemo(() => ({ ...table.params, filters }), [table.params, filters]);

  const { data, isLoading, isFetching, error } = usePlansAdmin(params);

  const edit = usePlanEdit();
  const remove = usePlanDelete();

  const toggleActive = useCallback(
    async (plan: PlanModel, isActive: boolean) => {
      await supabase.from('pricing_plans').update({ is_active: isActive }).eq('id', plan.id);
      qc.invalidateQueries({ queryKey: ['admin-plans'] });
      qc.invalidateQueries({ queryKey: ['pricing-plan-options'] });
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
      cycle,
      active,
      setCycle: setCycleFilter,
      setActive: setActiveFilter,
      reset: resetFilters,
      isActive: Boolean(cycle || active),
    },
    edit,
    remove,
    toggleActive,
    navigate,
    table,
  };
}

export type PlanFiltersState = ReturnType<typeof usePricingPlans>['filters'];
