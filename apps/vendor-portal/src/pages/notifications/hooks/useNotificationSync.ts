import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  notificationHeadline,
  useDesktopNotifications,
  useNotificationArrivals,
  useNotificationsRealtime,
  type NotificationRealtimeRow,
} from '@sinnapi/ui/notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';

/**
 * Keeps the notification centre live.
 *
 * The two halves of "realtime" are treated differently on purpose:
 *
 *   Counts move immediately. A sidebar badge that lags behind is the thing
 *   people notice, and nothing on screen shifts when a number changes.
 *
 *   Rows wait. An arrival is buffered behind the "N new" pill rather than
 *   spliced into the list, because a feed that inserts at the top while it is
 *   being read moves every row under the reader's cursor.
 *
 * Updates are not buffered — a read receipt (usually this user in another tab)
 * inserts nothing, so it folds straight in.
 *
 * Patching the cache from the realtime payload is deliberately avoided: the
 * payload is a raw table row, the feed is a paged query with a server-exact
 * total, and a hand-merged page would disagree with its own count.
 */
export function useNotificationSync() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  const alerts = useDesktopNotifications({ storageKey: 'sinnapi.vendor.desktopAlerts' });

  const refreshCounts = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['unread'] });
    // The dashboard reads the same figures; leaving it stale means the two
    // screens disagree the moment the vendor navigates between them.
    void qc.invalidateQueries({ queryKey: ['v-dashboard'] });
  }, [qc]);

  const arrivals = useNotificationArrivals({
    onApply: useCallback(() => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    }, [qc]),
  });

  const onInsert = useCallback(
    (row: NotificationRealtimeRow) => {
      arrivals.record(row);
      refreshCounts();

      // Tagged by id so a burst collapses instead of stacking, and the click
      // brings the vendor back to this page rather than wherever they left off.
      alerts.notify({
        title: notificationHeadline(row.trigger_key, row.title),
        body: row.body,
        tag: row.id,
        onClick: () => navigate('/notifications'),
      });
    },
    [arrivals, refreshCounts, alerts, navigate],
  );

  const onUpdate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['notifications'] });
    refreshCounts();
  }, [qc, refreshCounts]);

  useNotificationsRealtime({
    client: supabase,
    recipientId: user?.id,
    onInsert,
    onUpdate,
  });

  return { arrivals, alerts };
}
