// Notification kit — the shared notification centre for the client and vendor
// portals (and available to admin). Presentational components plus the hooks
// that own filtering, realtime arrivals and desktop alerts.
//
// Router-free and data-client-free by construction: navigation is expressed as
// a `NotificationTargetResolver` the host supplies, and the Supabase client is
// injected into the realtime hook. That is what lets two portals with different
// routes, different clients and different query layers share one behaviour.
export * from './types';
export * from './format';
export * from './schema';
export * from './fromRow';

export * from './molecules';
export * from './organisms';

export * from './hooks/useNotificationFeed';
export * from './hooks/useNotificationsRealtime';
export * from './hooks/useNotificationArrivals';
export * from './hooks/useDesktopNotifications';
