import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toPlayableMedia, useMediaViewer } from '@sinnapi/ui/media';
import { useMedia } from '@/hooks/queries';
import type { MediaModel } from '@/lib/types';
import { countMedia, filterMedia, mediaFilterOptions, type MediaFilter } from '../schema';
import { useMediaActions } from './useMediaActions';
import { useMediaReorder } from './useMediaReorder';
import { usePortfolioPlan } from './usePortfolioPlan';

/** Stable identity, so an empty portfolio doesn't re-derive everything each render. */
const NO_ROWS: MediaModel[] = [];

/**
 * The portfolio screen's state, assembled from the four hooks that each own one
 * concern: the order being curated, what may be done to an item, what the plan
 * allows, and which item the viewer is on.
 *
 * Composed here rather than in the component so the workspace stays an
 * arrangement of parts. The order the pieces are wired matters: `useMediaReorder`
 * shadows the query's rows with an in-progress draft, so *everything* downstream
 * — counts, filtering, the viewer's index — reads `reorder.ordered` rather than
 * the query directly. Reading the query in one place and the draft in another is
 * exactly how a drag ends up moving the wrong tile.
 */
export function usePortfolio(vendorId: string) {
  const { data, isLoading, error } = useMedia(vendorId);
  const rows = data ?? NO_ROWS;

  const reorder = useMediaReorder(vendorId, rows);
  const actions = useMediaActions(vendorId);

  const [filter, setFilter] = useState<MediaFilter>('all');
  const [searchParams, setSearchParams] = useSearchParams();
  // `?add=1` — the dashboard card and the setup wizard send a vendor here to
  // add something, not to browse. Opening on arrival saves them hunting for the
  // button on a grid they did not come to read.
  const [isDialogOpen, setDialogOpen] = useState(() => searchParams.get('add') === '1');

  // Dropped once consumed, so closing the dialog and reloading — or coming back
  // with the browser's Back button — doesn't reopen it over the grid.
  useEffect(() => {
    if (searchParams.get('add') !== '1') return;
    const next = new URLSearchParams(searchParams);
    next.delete('add');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const counts = useMemo(() => countMedia(reorder.ordered), [reorder.ordered]);
  const filterOptions = useMemo(() => mediaFilterOptions(counts), [counts]);

  // Removing the last video while "Videos" is selected would otherwise leave the
  // page on a tab that no longer exists, showing an empty grid with no way back.
  useEffect(() => {
    if (!filterOptions.some((option) => option.value === filter)) setFilter('all');
  }, [filterOptions, filter]);

  /**
   * The rows on screen, already classified for rendering. One list feeds the
   * grid, the viewer and the thumbnail strip, so their indexes cannot disagree.
   */
  const visible = useMemo(
    () => toPlayableMedia(filterMedia(reorder.ordered, filter)),
    [reorder.ordered, filter],
  );

  const viewer = useMediaViewer(visible);
  const plan = usePortfolioPlan(counts.image);

  return {
    isLoading,
    error,
    /** Empty portfolio vs. a filter that happens to match nothing. */
    isEmpty: reorder.ordered.length === 0,
    visible,
    counts,
    filter,
    filterOptions,
    setFilter,
    /**
     * Dragging is offered only on the unfiltered grid: positions in a filtered
     * view don't correspond to `sort_order`, so a drop there would move the tile
     * somewhere the vendor didn't point at.
     */
    canReorder: filter === 'all' && reorder.ordered.length > 1,
    reorder,
    actions,
    viewer,
    plan,
    dialog: {
      open: isDialogOpen,
      openDialog: () => setDialogOpen(true),
      closeDialog: () => setDialogOpen(false),
      /** New rows append to the end of the curated order. */
      nextSortOrder: reorder.ordered.length,
      needsCover: !reorder.ordered.some((row) => row.is_primary),
    },
  };
}
