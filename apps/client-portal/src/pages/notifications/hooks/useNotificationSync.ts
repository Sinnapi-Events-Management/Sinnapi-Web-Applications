import { useNotificationLiveContext } from '@sinnapi/ui/notifications';

/**
 * The page's view of the portal's live notification subscription.
 *
 * WHAT THIS USED TO BE, AND WHY IT MOVED
 * It owned the subscription itself: it opened the `postgres_changes` channel,
 * raised the desktop alert and buffered arrivals — all from inside the
 * notifications page. So the portal was live only while the user was already
 * looking at the notification centre. On every other route, which is where
 * people actually work, an accepted quote or a confirmed booking landed in the
 * database and made no sound, moved no badge and raised no alert.
 *
 * The subscription now lives in `AppShell`, which mounts on every authenticated
 * route. This hook reads it. The indirection is worth keeping rather than
 * calling the context hook inline: the page composes `sync.arrivals` and
 * `sync.alerts`, and that shape is now this file's whole job.
 */
export function useNotificationSync() {
  return useNotificationLiveContext();
}
