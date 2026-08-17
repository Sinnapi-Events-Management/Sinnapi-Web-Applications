import { useNotificationLiveContext } from '@sinnapi/ui/notifications';

/**
 * The page's view of the console's live notification subscription.
 *
 * Admin had no equivalent of this at all — the other two portals at least owned
 * a subscription on their notifications page, whereas here the feed only ever
 * moved when a query happened to refetch. The subscription now lives in
 * `AppShell` for all three, and this hook reads it.
 *
 * Named to match the client and vendor portals so the three pages read the same
 * way, even though admin's notification centre is otherwise its own
 * implementation.
 */
export function useNotificationSync() {
  return useNotificationLiveContext();
}
