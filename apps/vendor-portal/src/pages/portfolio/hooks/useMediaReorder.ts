import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { rpcErrorMessage } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import type { MediaModel } from '@/lib/types';
import { MEDIA_ERRORS } from '../schema';

function arrayMove<T>(items: T[], from: number, to: number): T[] {
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * The order the vendor is arranging, and the write that makes it stick.
 *
 * The drag is *optimistic and local*: a `draft` array shadows the query's rows
 * for as long as one is in flight, so tiles follow the pointer at 60fps instead
 * of waiting on a round trip per hop. The draft is dropped the moment the server
 * comes back with a different order — which is what a successful save produces —
 * so there is exactly one moment of truth and no reconciliation logic.
 *
 * Reordering is hand-rolled rather than pulled from a drag-and-drop library:
 * adding one to the workspace for a single grid is a poor trade, and HTML5 drag
 * events cover the desktop case in a few lines. They do *not* fire on touch, so
 * `move` exists alongside them — it is what the tile's menu and the keyboard use,
 * and it is the reason this works on a phone at all.
 */
export function useMediaReorder(vendorId: string, rows: MediaModel[]) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<MediaModel[] | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The tile being dragged, mirrored outside React state. `dragover` fires many
  // times per second and each one needs the *current* position to compute the
  // next hop, which a state value read from a stale closure cannot give — and
  // deriving it inside a `setState` updater would run twice under StrictMode and
  // move the tile two places per hop.
  const dragFrom = useRef<number | null>(null);

  // Identity of the server's order. A refetch that returns the same sequence
  // leaves an in-progress drag alone; one that returns a different sequence has
  // superseded the draft, so the draft goes.
  const signature = rows.map((row) => row.id).join(',');
  const lastSignature = useRef(signature);
  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    setDraft(null);
  }, [signature]);

  const ordered = draft ?? rows;

  /**
   * Writes only the rows whose position actually changed — moving one tile in a
   * gallery of thirty is two updates, not thirty. `sort_order` is rewritten as a
   * dense 0..n-1 sequence so gaps left by removals never accumulate.
   */
  const persist = useCallback(
    async (next: MediaModel[]) => {
      const changed = next
        .map((row, index) => ({ row, index }))
        .filter(({ row, index }) => row.sort_order !== index);
      if (changed.length === 0) return;

      setError(null);
      const results = await Promise.all(
        changed.map(({ row, index }) =>
          supabase.from('vendor_media').update({ sort_order: index }).eq('id', row.id),
        ),
      );

      const failure = results.find((result) => result.error)?.error;
      if (failure) {
        setError(rpcErrorMessage(failure, MEDIA_ERRORS));
        setDraft(null); // Snap back to the order the server still holds.
      }
      qc.invalidateQueries({ queryKey: ['v-media', vendorId] });
    },
    [qc, vendorId],
  );

  /** Move one item by `delta` positions. Clamped, so the ends are simply no-ops. */
  const move = useCallback(
    (from: number, delta: number) => {
      const to = from + delta;
      if (to < 0 || to >= ordered.length) return;
      const next = arrayMove(ordered, from, to);
      setDraft(next);
      void persist(next);
    },
    [ordered, persist],
  );

  const onDragStart = useCallback((index: number) => {
    dragFrom.current = index;
    setDragIndex(index);
  }, []);

  /** Live preview: the list reflows under the pointer rather than on drop. */
  const onDragOver = useCallback(
    (index: number) => {
      const from = dragFrom.current;
      if (from === null || from === index) return;
      dragFrom.current = index;
      setDragIndex(index);
      setDraft(arrayMove(ordered, from, index));
    },
    [ordered],
  );

  const onDragEnd = useCallback(() => {
    dragFrom.current = null;
    setDragIndex(null);
    if (draft) void persist(draft);
  }, [draft, persist]);

  return {
    /** The rows to render — the draft while dragging, the server's order otherwise. */
    ordered,
    dragIndex,
    error,
    dismissError: () => setError(null),
    move,
    onDragStart,
    onDragOver,
    onDragEnd,
  };
}
