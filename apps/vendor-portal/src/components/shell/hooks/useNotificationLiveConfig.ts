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
 * The vendor portal's half of the shared live subscription: its data client,
 * its signed-in profile, its query keys and its routes.
 *
 * Everything portal-specific about liveness is here, which is what lets
 * `useNotificationLive` in `@sinnapi/ui` stay router-free and data-client-free.
 */
export function useNotificationLiveConfig(): UseNotificationLiveOptions {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  const onCountsChanged = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['unread'] });
    // The dashboard reads the same figures; leaving it stale means the two
    // screens disagree the moment the vendor navigates between them.
    void qc.invalidateQueries({ queryKey: ['v-dashboard'] });
  }, [qc]);

  const onFeedChanged = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['notifications'] });
  }, [qc]);

  // A desktop alert is clicked from another window, so it lands on the thing it
  // is about — the quote request, the booking — rather than on the feed, where
  // the vendor would have to find the same row a second time.
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
    storagePrefix: 'sinnapi.vendor',
    onCountsChanged,
    onFeedChanged,
    onOpen,
  };
}
