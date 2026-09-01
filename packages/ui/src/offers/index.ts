// Offers kit — promotions and discount codes, from the badge on a package card
// to the card in the public offers directory.
//
// One renderer per element across all four apps, for the reason `PackageShowcase`
// is one renderer: a saving shown to a signed-out visitor and a saving shown to
// the same person after they sign in are a claim about money, and the moment the
// two diverge the price on the public page stops being trustworthy.
//
// Layered schema → atoms → molecules → organisms like the rest of the design
// system, and — like the media, settings and messaging kits — it imports no
// Supabase client. Every row arrives already fetched and every write is a
// callback, because the four apps reach the database through four clients and a
// component that picked one could only work in the app it was written for.
//
// `schema/offerPricing` is the part that is expensive to get wrong: it mirrors
// `resolve_discount_amount` in SQL clause for clause so a card can price a
// discount without a round trip per tier. It is display arithmetic only —
// nothing it computes may ever be sent as an amount. See its header.
//
// Kept off the root barrel so `@sinnapi/ui` stays free of this graph for screens
// that never mention an offer. Import from `@sinnapi/ui/offers`.
export * from './types';
export * from './schema';
export * from './atoms';
export * from './molecules';
export * from './organisms';
export * from './hooks/useOfferClock';
