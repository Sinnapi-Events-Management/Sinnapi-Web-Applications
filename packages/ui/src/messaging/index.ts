// Messaging kit — the shared chat surface for the admin, client and vendor
// portals. Presentational components plus the hooks that own realtime and
// composer state; no data client is imported here, so every Supabase-touching
// dependency is injected by the portal that uses it.
export * from './types';
export * from './format';
export * from './conversationType';

export * from './atoms';
export * from './molecules';

export * from './organisms/MessageThread';
export * from './organisms/ThreadComposer';
export * from './organisms/ThreadPanel';
export * from './organisms/InboxLayout';
export * from './organisms/InboxToolbar';
export * from './organisms/ConversationListPanel';

export * from './hooks/useConversationChannel';
export * from './hooks/useMessagingRealtime';
export * from './hooks/useAttachmentStaging';
export * from './hooks/useInboxFilters';
