/**
 * The page's two sections. They live in the URL (`/profile?tab=security`) so the
 * avatar menu can deep-link straight to the password form and a reload — or a
 * shared link — lands on the same section the user was reading.
 *
 * The first entry is the default and is represented by the absence of the
 * parameter; narrowing an untrusted `?tab=` value against this list is
 * `useUrlTab`'s job, so there is no hand-rolled parser here.
 */
export const PROFILE_TABS = ['profile', 'security'] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number];
