// Settings kit — the account-security and privacy sections shared by the client
// and vendor portals, layered atoms → molecules → organisms like the rest of the
// design system.
//
// Deliberately NOT re-exported from the root barrel: it depends on
// react-hook-form, zod and react-router-dom, which are optional peers only the
// SPA portals install — the Next.js `web-public` app must never pull them into
// its module graph. Import from `@sinnapi/ui/settings`.
//
// No Supabase client is imported anywhere below. The portals share one Supabase
// project but not one session (each has its own `storageKey` and its own portal
// gate), so every write is injected as a callback and the data layer stays the
// portal's — the same arrangement as the messaging and notifications kits.
export * from './types';
export * from './schema';
export * from './molecules';
export * from './organisms';

export * from './hooks/useAsyncAction';
export * from './hooks/useChangePasswordForm';
export * from './hooks/useDeletionRequestForm';
export * from './hooks/useDisclosure';
