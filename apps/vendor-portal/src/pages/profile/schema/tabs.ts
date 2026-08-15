/**
 * The page's two sections, mirrored into the URL (`/profile?tab=personal`).
 *
 * The split is the point: "Business" is the public listing clients see, "Personal"
 * is the human behind the account. They were previously spread across two pages —
 * business here, personal buried in Settings — which meant the vendor's own name
 * and photo lived under a heading about payouts and privacy.
 *
 * Business leads because it is what this portal is for, and it is the default
 * (represented by the absence of the parameter, so `/profile` stays canonical).
 */
export const PROFILE_TABS = ['business', 'personal'] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number];
