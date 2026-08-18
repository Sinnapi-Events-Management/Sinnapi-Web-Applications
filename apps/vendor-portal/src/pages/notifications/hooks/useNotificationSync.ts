import { useNotificationLiveContext } from '@sinnapi/ui/notifications';

/**
 * The page's view of the portal's live notification subscription.
 *
 * WHAT THIS USED TO BE, AND WHY IT MOVED
 * It owned the subscription itself: it opened the `postgres_changes` channel,
 * raised the desktop alert and buffered arrivals — all from inside the
 * notifications page. So the portal was live only while the vendor was already
 * looking at the notification centre, and a quote request or an accepted quote
 * arriving while they worked on their calendar made no sound and moved no
 * badge.
 *
 * The subscription now lives in `AppShell`, which mounts on every authenticated
 * route. This hook reads it.
 */
export function useNotificationSync() {
  return useNotificationLiveContext();
}
