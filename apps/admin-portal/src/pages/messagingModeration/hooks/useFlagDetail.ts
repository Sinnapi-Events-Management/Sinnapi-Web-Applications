import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FlagView } from './useMessagingModeration';

/**
 * Pure UI-state hook for the master–detail layout: tracks which flag is open in
 * the review pane. Deliberately kept out of useMessagingModeration so all
 * data/mutation logic stays untouched — this only owns presentation state.
 *
 * The active flag auto-clears when it leaves the visible rows (blocked,
 * dismissed or filtered out), so the detail pane never points at a stale flag.
 */
export function useFlagDetail(rows: FlagView[]) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = useMemo(() => rows.find((f) => f.id === activeId) ?? null, [rows, activeId]);

  useEffect(() => {
    if (activeId && !rows.some((f) => f.id === activeId)) setActiveId(null);
  }, [rows, activeId]);

  const open = useCallback((id: string) => setActiveId(id), []);
  const close = useCallback(() => setActiveId(null), []);
  const isOpen = useCallback((id: string) => id === activeId, [activeId]);

  return { activeId, active, open, close, isOpen };
}

export type FlagDetailState = ReturnType<typeof useFlagDetail>;
