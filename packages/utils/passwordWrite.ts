/**
 * Set the signed-in person's own password — the ONE way all three portals do it.
 *
 * Supabase's `updateUser({ password })` alone is no longer enough: a trigger on
 * `auth.users` (20261110000003) refuses a password write through GoTrue unless
 * the server issued a ticket for it moments before. That is what stops someone
 * holding a stolen session token from calling GoTrue directly and locking the
 * owner out — sessions now last weeks, so a token is worth stealing.
 *
 * `authorize_password_change` issues the ticket only when this session has just
 * proved who it is: a password re-confirmed in the last 15 minutes, a reset or
 * invite link opened in the last hour, or a password sign-in in the last 30
 * minutes (the forced change after a one-time password). Otherwise it answers
 * `reauth_required`, surfaced here as `REAUTH_REQUIRED_MESSAGE`.
 */

/** Shown when the session is too old to change the password without proving it again. */
export const REAUTH_REQUIRED_MESSAGE =
  'For your security, please sign out and sign in again, then set your password.';

/** Shown when a reset link was opened too long ago. */
export const RESET_LINK_STALE_MESSAGE =
  'This reset link has expired. Request a new one and use it within the hour.';

/**
 * Just enough of `SupabaseClient` for this — structural, so the package does
 * not depend on supabase-js (same arrangement as `portalSignIn`).
 */
export type PasswordWriter = {
  rpc(fn: string): PromiseLike<{ error: { message: string } | null }>;
  auth: {
    updateUser(attrs: {
      password: string;
      data?: Record<string, unknown>;
      current_password?: string;
    }): Promise<{ error: { message: string } | null }>;
  };
};

/**
 * Resolves to null on success, or a sentence to show the person.
 * `reauthMessage` lets a reset-link screen say "request a new link" instead.
 */
export async function updateOwnPassword(
  client: PasswordWriter,
  attrs: { password: string; data?: Record<string, unknown>; current_password?: string },
  reauthMessage: string = REAUTH_REQUIRED_MESSAGE,
): Promise<string | null> {
  const { error: ticketError } = await client.rpc('authorize_password_change');
  if (ticketError) {
    return ticketError.message === 'reauth_required'
      ? reauthMessage
      : 'We could not update your password. Please try again.';
  }
  const { error } = await client.auth.updateUser(attrs);
  return error ? error.message : null;
}
