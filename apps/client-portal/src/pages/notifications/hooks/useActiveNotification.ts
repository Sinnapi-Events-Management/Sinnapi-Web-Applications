import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { NotificationView } from '@sinnapi/ui/notifications';

/**
 * Which notification is open in the detail pane, plus the read receipt that
 * follows from opening it.
 *
 * The open row is held as a *snapshot* rather than looked up in the feed by id.
 * Opening an unread row marks it read, which under the "Unread" tab immediately
 * filters that row away — an id-based lookup would slam the pane shut the
 * moment it opened. The snapshot keeps the pane stable until it is closed.
 *
 * Each notification is stamped at most once per mount, and a row the user has
 * deliberately put back to unread is not re-stamped while it stays open — that
 * is what makes "Mark as unread" in the pane actually stick.
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
        // A failed stamp isn't worth interrupting the reader — drop the id so
        // the next open retries instead of leaving it in the "already done" set.
        marked.current.delete(id);
        return;
      }
      // Reflect the receipt in the open pane without waiting for the refetch,
      // so the "Unread" pill doesn't linger on something just read.
      setActive((current) =>
        current?.id === id
          ? { ...current, unread: false, readAt: new Date().toISOString() }
          : current,
      );
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      void qc.invalidateQueries({ queryKey: ['unread'] });
      void qc.invalidateQueries({ queryKey: ['dashboard-counts'] });
    });

    return () => {
      cancelled = true;
    };
  }, [active, qc]);

  const open = useCallback((notification: NotificationView) => setActive(notification), []);
  const close = useCallback(() => setActive(null), []);

  /**
   * Put the open row back to unread in the pane. The write itself belongs to
   * `useNotificationActions`; this only keeps the snapshot honest and stops the
   * auto-stamp above from immediately undoing it.
   */
  const markOpenUnread = useCallback((id: string) => {
    marked.current.add(id);
    setActive((current) =>
      current?.id === id ? { ...current, unread: true, readAt: null } : current,
    );
  }, []);

  return { active, open, close, markOpenUnread };
}

export type ActiveNotificationState = ReturnType<typeof useActiveNotification>;
