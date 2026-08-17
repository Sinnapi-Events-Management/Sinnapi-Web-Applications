'use client';
import { useCallback } from 'react';
import { notificationHeadline } from '../schema/domains';
import { useDesktopNotifications, type DesktopNotifications } from './useDesktopNotifications';
import { useNotificationChime, type NotificationChime } from './useNotificationChime';
import { useNotificationArrivals, type NotificationArrivals } from './useNotificationArrivals';
import {
  useNotificationsRealtime,
  type NotificationRealtimeRow,
  type NotificationsRealtimeClient,
} from './useNotificationsRealtime';

export type NotificationLive = {
  /** The buffer behind the feed's "N new" pill. */
  arrivals: NotificationArrivals;
  /** OS-level toasts, for when the tab is in the background. */
  alerts: DesktopNotifications;
  /** The audible cue, for when it is not. */
  chime: NotificationChime;
};

export type UseNotificationLiveOptions = {
  /** The portal's Supabase client. `@sinnapi/ui` holds none of its own. */
  client: NotificationsRealtimeClient;
  /** The signed-in profile. Nothing subscribes until this resolves. */
  recipientId: string | undefined;
  /**
   * localStorage key prefix for the two opt-ins, e.g. `sinnapi.client`. Kept
   * per portal so enabling sound in the vendor portal does not silently enable
   * it in the client one, which a shared key would.
   */
  storagePrefix: string;
  /** Unread badges moved. Invalidate whatever counts the portal shows. */
  onCountsChanged: () => void;
  /** The feed itself is stale — a row was read, usually in another tab. */
  onFeedChanged: () => void;
  /** The user activated a desktop toast. Navigate to the notification. */
  onOpen: (row: NotificationRealtimeRow) => void;
};

/**
 * Everything that makes a notification *arrive* rather than merely exist.
 *
 * MOUNT THIS ONCE, IN THE SHELL
 * It used to live on the notifications page, which meant the subscription — and
 * with it the badge, the toast and any hope of a sound — existed only while the
 * user was already looking at the notification centre. Every other route was
 * silent, which is the bug this hook is shaped to make impossible: the shell
 * mounts on every authenticated route, so there is nowhere left to be quiet.
 *
 * The three signals are deliberately not the same signal:
 *
 *   Counts move immediately. A badge that lags is the thing people notice, and
 *   nothing on screen shifts when a number changes.
 *
 *   Rows wait. An arrival is buffered behind the feed's pill rather than spliced
 *   in, because a list that inserts at the top while it is being read moves
 *   every row under the reader's cursor.
 *
 *   The alert fires once per arrival, tagged by id so a burst collapses. The
 *   chime has its own throttle for the same burst, in `useNotificationChime`.
 *
 * Updates are not buffered — a read receipt inserts nothing, so it folds
 * straight in.
 */
export function useNotificationLive({
  client,
  recipientId,
  storagePrefix,
  onCountsChanged,
  onFeedChanged,
  onOpen,
}: UseNotificationLiveOptions): NotificationLive {
  const alerts = useDesktopNotifications({ storageKey: `${storagePrefix}.desktopAlerts` });
  const chime = useNotificationChime({ storageKey: `${storagePrefix}.notificationChime` });

  const arrivals = useNotificationArrivals({ onApply: onFeedChanged });

  const onInsert = useCallback(
    (row: NotificationRealtimeRow) => {
      arrivals.record(row);
      onCountsChanged();

      // Sound first, and unconditionally on visibility: the toast is suppressed
      // while the tab is focused — correctly, the page already shows the row —
      // so the chime is the only cue a user working inside the portal gets.
      chime.play();

      alerts.notify({
        title: notificationHeadline(row.trigger_key, row.title),
        body: row.body,
        // Tagged by id so a burst collapses into one toast rather than a column.
        tag: row.id,
        onClick: () => onOpen(row),
      });
    },
    [arrivals, onCountsChanged, chime, alerts, onOpen],
  );

  const onUpdate = useCallback(() => {
    onFeedChanged();
    onCountsChanged();
  }, [onFeedChanged, onCountsChanged]);

  useNotificationsRealtime({ client, recipientId, onInsert, onUpdate });

  return { arrivals, alerts, chime };
}
