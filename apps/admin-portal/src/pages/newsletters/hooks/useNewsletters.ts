import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTableState, type PageFilters } from '@sinnapi/ui';
import { useNewsletterCampaigns, useNewsletterCampaignCounts } from '@/hooks/queries';
import { useStatusFilter, ALL_STATUSES } from '@/hooks/useStatusFilter';
import { useSearchTerm } from '@/hooks/useSearchTerm';
import { supabase } from '@/lib/supabase';
import {
  CAMPAIGN_STATUSES,
  AUDIENCE_META,
  buildCampaignTabs,
  getEmptyMessage,
  type CampaignTabValue,
} from '../schema';
import type { NewsletterAudience } from '@/lib/types';

/**
 * Coordinator for the campaign list: status tabs + audience filter + search +
 * pagination, plus the one write this page owns — creating a draft.
 *
 * Creation happens here rather than on the composer route because a campaign
 * needs an id before anything can be attached to it (blocks, recipients, an
 * attestation). The alternative — a composer that holds an unsaved campaign in
 * memory until the first save — means every one of those attachments has to
 * handle "not persisted yet", and a browser refresh loses the work.
 */
export function useNewsletters() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { onPageChange } = table.controls;
  const resetPage = useCallback(() => onPageChange(0), [onPageChange]);

  const status = useStatusFilter({ valid: CAMPAIGN_STATUSES, onChange: resetPage });
  const audience = useStatusFilter({
    valid: ['clients', 'vendors'] as const,
    column: 'audience',
    param: 'audience',
    onChange: resetPage,
  });
  const search = useSearchTerm({ onChange: resetPage });

  const params = useMemo(() => {
    const filters: PageFilters = {};
    if (status.value !== ALL_STATUSES) filters.status = status.value;
    if (audience.value !== ALL_STATUSES) filters.audience = audience.value;
    if (search.query) filters.search = search.query;
    return { ...table.params, filters: Object.keys(filters).length ? filters : undefined };
  }, [table.params, status.value, audience.value, search.query]);

  const { data, isLoading, isFetching, error } = useNewsletterCampaigns(params);
  const { data: counts, isLoading: countsLoading } = useNewsletterCampaignCounts(search.query);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const create = useCallback(
    async (next: { title: string; subject: string; audience: NewsletterAudience }) => {
      setCreating(true);
      setCreateError(null);
      const { data: row, error: e } = await supabase
        .from('newsletter_campaigns')
        .insert({
          title: next.title,
          subject: next.subject,
          audience: next.audience,
          // Derived, never asked for: the topic a campaign mails under is a
          // consequence of its audience, and letting an operator pick a
          // mismatched pair would send vendor mail against client consent.
          topic: AUDIENCE_META[next.audience].topic,
          blocks: [],
        })
        .select('id')
        .single();
      setCreating(false);
      if (e) {
        setCreateError(e.message);
        return;
      }
      qc.invalidateQueries({ queryKey: ['newsletter-campaigns'] });
      qc.invalidateQueries({ queryKey: ['newsletter-campaign-counts'] });
      navigate(`/newsletters/${row.id}`);
    },
    [navigate, qc],
  );

  const filtered =
    Boolean(search.query) || status.value !== ALL_STATUSES || audience.value !== ALL_STATUSES;

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    counts,
    countsLoading,
    isLoading,
    isFetching,
    pageError:
      createError ??
      (error ? (error instanceof Error ? error.message : 'Failed to load campaigns.') : null),
    emptyMessage: getEmptyMessage(filtered),
    tabs: buildCampaignTabs(counts),
    statusTab: status.value as CampaignTabValue,
    onStatusChange: status.setValue,
    audienceValue: audience.value as string,
    // Widened to `string` for the toolbar's segmented control, which reports
    // the raw value MUI gives it. `useStatusFilter` narrows it back on the way
    // in — anything outside `valid` falls through to the unfiltered tab — so
    // the widening cannot smuggle an unknown audience into the query.
    onAudienceChange: audience.setValue as (next: string) => void,
    search,
    table,
    create,
    creating,
    openCampaign: (id: string) => navigate(`/newsletters/${id}`),
  };
}
