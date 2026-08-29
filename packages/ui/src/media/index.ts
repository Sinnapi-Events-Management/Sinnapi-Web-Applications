// Media kit — the portfolio grid, the full-screen viewer and the URL classifier
// behind both, shared by the client portal (which browses a vendor's work) and
// the vendor portal (which curates it).
//
// Layered schema → hooks → atoms → molecules → organisms like the rest of the
// design system, and, like the settings, messaging and profile kits, it imports
// no Supabase client: every row reaches it already fetched, and every write the
// vendor portal performs on top of it — delete, reorder, set-as-cover — is passed
// in as a render slot or a callback. What lives here is the part that is easy to
// get wrong and expensive to get wrong twice: which URLs may be framed at all
// (see `schema/mediaSource`), and how stepping, keyboard control and the
// thumbnail strip agree on one index.
//
// Kept off the root barrel so `@sinnapi/ui` stays free of this graph for apps
// that never show a gallery. Import from `@sinnapi/ui/media`.
export * from './types';
export * from './schema';
export * from './atoms';
export * from './molecules';
export * from './organisms';
export * from './hooks/useMediaViewer';
