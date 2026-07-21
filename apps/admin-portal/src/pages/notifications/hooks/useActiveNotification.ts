import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { NotificationView } from './useNotifications';

/**
 * UI state for the master–detail feed: which notification is open in the detail
 * pane, plus the read receipt that follows from opening it.
 *
 * The open row is held as a *snapshot* rather than looked up in the list by id.
 * Opening an unread row marks it read, which under the "Unread" tab immediately
 * filters that row away — an id-based lookup would slam the pane shut the moment
 * it opened. The snapshot keeps the pane stable until the admin closes it.
 *
 * Each notification is stamped at most once per mount; re-opening an
 * already-read row writes nothing.
 */
export function useActiveNotification() {
  const qc = useQueryClient();
  const [active, setActive] = useState<NotificationView | null>(null);
  const marked = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!active?.unread || marked.current.has(active.id)) return;
    const id = active.id;
    marked.current.add(id);
    let cancelled = false;

    void supabase.rpc('mark_notification_read', { p_notification_id: id }).then(({ error }) => {
      if (cancelled) return;
      if (error) {
        // A failed stamp isn't worth interrupting the admin — drop the id so the
        // next open retries instead of leaving it in the "already done" set.
        marked.current.delete(id);
        return;
      }
      // Reflect the receipt in the open pane without waiting for the refetch, so
      // the "Unread" pill doesn't linger on a row that has just been read.
      setActive((current) =>
        current?.id === id
          ? { ...current, unread: false, readAt: new Date().toISOString() }
          : current,
      );
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      void qc.invalidateQueries({ queryKey: ['unread'] });
    });

    return () => {
      cancelled = true;
    };
  }, [active, qc]);

  const open = useCallback((notification: NotificationView) => setActive(notification), []);
  const close = useCallback(() => setActive(null), []);
  const isOpen = useCallback((id: string) => id === active?.id, [active?.id]);

  return { active, open, close, isOpen };
}

export type ActiveNotificationState = ReturnType<typeof useActiveNotification>;
