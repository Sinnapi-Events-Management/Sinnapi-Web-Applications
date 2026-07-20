import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useNotificationTemplates as useNotificationTemplatesQuery,
  useNotificationTemplateStats,
} from '@/hooks/queries';
import { useTableState } from '@/hooks/useTableState';
import { useStatusFilter, ALL_STATUSES } from '@/hooks/useStatusFilter';
import { useSearchTerm } from '@/hooks/useSearchTerm';
import { supabase } from '@/lib/supabase';
import type { PageFilters } from '@/lib/table';
import {
  NOTIFICATION_CHANNELS,
  buildChannelTabs,
  getEmptyMessage,
  type ChannelTabValue,
} from '../schema';

/**
 * Coordinator for the Notification Templates page: server-side channel filter +
 * free-text search + pagination + count badges, plus the per-row active toggle.
 * Filter/search state lives in the URL (via the shared hooks) so a filtered view
 * is refresh-safe and shareable; the table stays a thin consumer of `rows`.
 */
export function useNotificationTemplates() {
  const qc = useQueryClient();

  const table = useTableState({ sort: { field: 'trigger_key', direction: 'asc' } });
  const { onPageChange } = table.controls;
  const resetPage = useCallback(() => onPageChange(0), [onPageChange]);

  const channel = useStatusFilter({
    valid: NOTIFICATION_CHANNELS,
    column: 'channel',
    param: 'channel',
    onChange: resetPage,
  });
  const search = useSearchTerm({ onChange: resetPage });

  const params = useMemo(() => {
    const filters: PageFilters = {};
    if (channel.value !== ALL_STATUSES) filters.channel = channel.value;
    if (search.query) filters.search = search.query;
    return { ...table.params, filters: Object.keys(filters).length ? filters : undefined };
  }, [table.params, channel.value, search.query]);

  const { data, isLoading, isFetching, error } = useNotificationTemplatesQuery(params);
  const { data: stats, isLoading: statsLoading } = useNotificationTemplateStats(search.query);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const toggle = useCallback(
    async (id: string, isActive: boolean) => {
      setBusyId(id);
      setToggleError(null);
      const { error: e } = await supabase
        .from('notification_templates')
        .update({ is_active: isActive })
        .eq('id', id);
      setBusyId(null);
      if (e) {
        setToggleError(e.message);
        return;
      }
      qc.invalidateQueries({ queryKey: ['notification-templates'] });
      qc.invalidateQueries({ queryKey: ['notification-template-stats'] });
    },
    [qc],
  );

  const filtered = Boolean(search.query) || channel.value !== ALL_STATUSES;

  const pageError =
    toggleError ??
    (error ? (error instanceof Error ? error.message : 'Failed to load templates.') : null);

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    stats,
    statsLoading,
    isLoading,
    isFetching,
    pageError,
    emptyMessage: getEmptyMessage(filtered),
    tabs: buildChannelTabs(stats),
    channelTab: channel.value as ChannelTabValue,
    onChannelChange: channel.setValue,
    search,
    busyId,
    toggle,
    table,
  };
}
