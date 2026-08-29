// Profile kit — the identity, photo-upload and section-switching pieces shared by
// the admin, client and vendor portals, layered schema → hooks → molecules →
// organisms like the rest of the design system.
//
// Deliberately NOT re-exported from the root barrel, for the same reason as the
// settings kit: `useUrlTab` depends on react-router-dom, an optional peer only the
// SPA portals install — the Next.js `web-public` app must never pull it into its
// module graph. Import from `@sinnapi/ui/profile`.
//
// No Supabase client is imported anywhere below. The portals share one Supabase
// project but not one session (each has its own `storageKey` and its own portal
// gate), so every write is injected as a callback and the data layer stays the
// portal's — the same arrangement as the settings, messaging and notifications
// kits. What *is* shared is the part that is easy to get wrong: see
// `useProfileImageUpload` for why the upload/commit/cleanup ordering lives here.
export * from './types';
export * from './schema';
export * from './molecules';
export * from './organisms';

export * from './hooks/useProfileImageUpload';
// Re-exported from its home in the router kit, where the booking and other
// tabbed detail pages reach for it too. Kept on this entry point because the
// profile pages were its first callers and still import it from here.
export * from '../router/hooks/useUrlTab';
