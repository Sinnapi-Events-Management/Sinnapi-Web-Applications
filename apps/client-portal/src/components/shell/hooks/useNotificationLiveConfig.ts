import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  toNotificationView,
  type NotificationRealtimeRow,
  type UseNotificationLiveOptions,
} from '@sinnapi/ui/notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';
import { resolveTarget } from '@/pages/notifications/schema';

/**
 * The client portal's half of the shared live subscription: its data client,
 * its signed-in profile, its query keys and its routes.
 *
 * Everything portal-specific about liveness is here, which is what lets
 * `useNotificationLive` in `@sinnapi/ui` stay router-free and data-client-free —
 * the same reason the notification kit takes a `NotificationTargetResolver`
 * instead of shipping a route table.
 */
export function useNotificationLiveConfig(): UseNotificationLiveOptions {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  const onCountsChanged = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['unread'] });
    // The dashboard's unread tile reads the same figure; leaving it stale means
    // the two screens disagree the moment the user navigates between them.
    void qc.invalidateQueries({ queryKey: ['dashboard-counts'] });
  }, [qc]);

  const onFeedChanged = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['notifications'] });
  }, [qc]);

  // A desktop alert is clicked from another window, so it should land on the
  // thing it is about — the booking, the quote — not on the feed, where the
  // user would have to find the same row a second time. The feed is the
  // fallback for a trigger this portal serves no page for.
  const onOpen = useCallback(
    (row: NotificationRealtimeRow) => {
      const target = resolveTarget(
        toNotificationView({
          id: row.id,
          trigger_key: row.trigger_key,
          title: row.title,
          body: row.body,
          data: row.data ?? null,
          channel: 'in_app',
          created_at: row.created_at,
          read_at: row.read_at,
        }),
      );
      navigate(target?.path ?? '/notifications');
    },
    [navigate],
  );

  return {
    client: supabase,
    recipientId: user?.id,
    storagePrefix: 'sinnapi.client',
    onCountsChanged,
    onFeedChanged,
    onOpen,
  };
}
