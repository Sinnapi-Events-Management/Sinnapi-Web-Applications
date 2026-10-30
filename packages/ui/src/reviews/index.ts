// Reviews kit — the rating a client leaves on a booking, from the composer to
// the list of them on a vendor's public profile.
//
// One renderer per element across all four apps, for the same reason the offers
// kit is one renderer: a score shown to a signed-out visitor and the same score
// shown to the client about to book are a claim about a vendor's reputation, and
// the moment the two diverge neither is worth reading.
//
// Layered schema → atoms → molecules → organisms like the rest of the design
// system, and — like the media, offers, settings and messaging kits — it imports
// no Supabase client. Every row arrives already fetched and every write is a
// callback, because the four apps reach the database through four clients and a
// component that picked one could only work in the app it was written for.
//
// `schema/reviewRules` is the part worth reading first: it mirrors the gates in
// `20261026000001_review_unlock_and_integrity.sql` — the length caps the RPCs
// raise on, the six eligibility tokens `get_my_vendor_review_state` returns, and
// the reply-lock. The server is the enforcement; this is the UI declining to
// offer a write that would be refused, and saying why.
//
// Kept off the root barrel so `@sinnapi/ui` stays free of this graph for screens
// that never mention a review. Import from `@sinnapi/ui/reviews`.
export * from './types';
export * from './schema';
export * from './atoms';
export * from './molecules';
export * from './organisms';
