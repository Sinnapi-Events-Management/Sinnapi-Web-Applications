/**
 * The page's two sections. They live in the URL (`/profile?tab=security`) so the
 * avatar menu can deep-link straight to the password form and a reload — or a
 * shared link — lands on the same section the user was reading.
 */
export const PROFILE_TABS = ['profile', 'security'] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number];

export const DEFAULT_PROFILE_TAB: ProfileTab = 'profile';

/** Narrow an untrusted `?tab=` value, falling back to the first section. */
export function toProfileTab(value: string | null): ProfileTab {
  return PROFILE_TABS.includes(value as ProfileTab) ? (value as ProfileTab) : DEFAULT_PROFILE_TAB;
}
