import { createClient } from '@supabase/supabase-js';
import { downloadBase64File } from '@sinnapi/utils/download';
import type { ChangePasswordInput, DeletionRequestSummary } from '@sinnapi/ui/settings';
import { supabase } from './supabase';
import { invokeFunction } from './functions';

/**
 * The three self-service account actions behind the settings page.
 *
 * Lives beside the portal's Supabase client rather than in `@sinnapi/ui`, for
 * the same reason the messaging and notification data layers do: the design
 * system imports no data client, and the two portals do not share a session
 * (each holds its own `storageKey` and passes its own portal gate). The shared
 * half — every component and all the form state — is `@sinnapi/ui/settings`.
 */

/**
 * Wording the shared `useChangePasswordForm` matches on to decide that a
 * failure belongs under the current-password box rather than in a banner. Keep
 * the phrase "current password" in it.
 */
export const CURRENT_PASSWORD_REJECTED = 'That current password is incorrect.';

const SESSION_EXPIRED = 'Your session has expired. Sign in again and retry.';

/**
 * Check a password without disturbing the session the user is sitting in.
 *
 * `signInWithPassword` on the live client would work, but it replaces the
 * session — firing `SIGNED_IN`, sending `AuthProvider` back through the portal
 * gate, and re-running every subscription in the app — as a side effect of
 * typing into a dialog. A throwaway client with `persistSession: false` asks
 * GoTrue the same question and writes nothing: the session it mints exists only
 * in this function's scope and is discarded with it.
 *
 * It deliberately never calls `signOut`. supabase-js defaults that to a GLOBAL
 * scope, which would revoke every refresh token the account holds — signing the
 * user out of the portal they are currently using, mid-dialog, as the reward
 * for typing their password correctly.
 */
async function verifyCurrentPassword(email: string, password: string): Promise<void> {
  const verifier = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'sinnapi-vendor-verify',
      },
    },
  );

  const { error } = await verifier.auth.signInWithPassword({ email, password });
  if (error) throw new Error(CURRENT_PASSWORD_REJECTED);
}

/** Prove the current password, then set the new one. */
export async function changePassword({
  currentPassword,
  newPassword,
}: ChangePasswordInput): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error(SESSION_EXPIRED);

  await verifyCurrentPassword(user.email, currentPassword);

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

/** Reasons `data-export` can refuse, in words the person who clicked will understand. */
const EXPORT_ERRORS: Record<string, string> = {
  export_too_large:
    'Your export is too large to download here. Contact support and we will send it to you directly.',
  profile_not_found: SESSION_EXPIRED,
  unauthorized: SESSION_EXPIRED,
};

type ExportResponse = { fileName: string; mimeType: string; base64: string };

/** Ask the server for the account's data export and hand the PDF to the browser. */
export async function exportMyData(): Promise<void> {
  const { data, error } = await invokeFunction<ExportResponse>('data-export', {});
  if (error) throw new Error(EXPORT_ERRORS[error] ?? error);
  if (!data?.base64) throw new Error('The export came back empty. Please try again.');
  downloadBase64File(data.base64, data.fileName, data.mimeType);
}

/**
 * File a right-to-erasure request.
 *
 * A plain insert, not an Edge Function: `erasure_requests` already carries an
 * RLS policy of `with check (profile_id = auth.uid())`, so the database will
 * only ever accept a request the caller made about themselves — which is the
 * entire authorisation rule this operation has. The admin portal's compliance
 * queue reads the same rows.
 */
export async function requestDataDeletion(reason: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error(SESSION_EXPIRED);

  const { error } = await supabase.from('erasure_requests').insert({
    profile_id: user.id,
    requested_by: user.id,
    notes: reason || null,
    scope: { portal: 'vendor', source: 'settings' },
  });
  if (error) throw new Error(error.message);
}

/** The account's most recent erasure request, or null if it has never asked. */
export async function fetchLatestDeletionRequest(): Promise<DeletionRequestSummary | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('erasure_requests')
    .select('id,status,created_at')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as { id: string; status: DeletionRequestSummary['status']; created_at: string };
  return { id: row.id, status: row.status, createdAt: row.created_at };
}
