import { downloadBase64File } from '@sinnapi/utils/download';
import { updateOwnPassword } from '@sinnapi/utils/passwordWrite';
import type {
  ChangePasswordInput,
  DeletionRequestSummary,
  SignedInSession,
} from '@sinnapi/ui/settings';
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

/** What `confirm-password` can answer, in words the person who typed it will understand. */
const CONFIRM_ERRORS: Record<string, string> = {
  wrong_password: CURRENT_PASSWORD_REJECTED,
  too_many_attempts: 'Too many wrong attempts. Wait 15 minutes and try again.',
  unauthorized: SESSION_EXPIRED,
  request_timed_out: 'No connection. Check your internet and try again.',
};

/**
 * Prove the signed-in person knows the password (step-up).
 *
 * Runs on the server (`confirm-password`), which verifies against GoTrue,
 * throws away the verification session it had to mint, counts failures for a
 * lockout, and records the success against THIS session. The database then
 * lets this session make the protected change (payout bank details) for 15
 * minutes — the unlock is enforced there, not by whatever asked.
 *
 * Replaces an in-browser `signInWithPassword` on a throwaway client, which
 * left an orphaned session in `auth.sessions` every time — a phantom
 * "device" that would now show up under "Where you're signed in".
 */
export async function confirmPassword(password: string): Promise<void> {
  const { error } = await invokeFunction('confirm-password', { password });
  if (error) {
    throw new Error(CONFIRM_ERRORS[error] ?? 'We could not check your password. Please try again.');
  }
}

/** Prove the current password, then set the new one. */
export async function changePassword({
  currentPassword,
  newPassword,
}: ChangePasswordInput): Promise<void> {
  // Records a confirmation for this session, which is what lets
  // `authorize_password_change` issue the ticket the auth.users guard wants.
  await confirmPassword(currentPassword);

  const failure = await updateOwnPassword(supabase, { password: newPassword });
  if (failure) throw new Error(failure);
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
    scope: { portal: 'client', source: 'settings' },
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

// ---------------------------------------------------------------------
// "Where you're signed in"
// ---------------------------------------------------------------------

type SessionRow = {
  session_id: string;
  portal: SignedInSession['portal'];
  device: string | null;
  os: string | null;
  browser: string | null;
  country: string | null;
  remember: boolean;
  signed_in_at: string;
  last_active_at: string;
  is_current: boolean;
};

/** Every live session of this account, this device first. */
export async function listMySessions(): Promise<SignedInSession[]> {
  const { data, error } = await supabase.rpc('list_my_sessions');
  if (error) throw new Error('We could not load your devices. Please try again.');
  return ((data ?? []) as SessionRow[]).map((r) => ({
    id: r.session_id,
    portal: r.portal,
    device: r.device,
    os: r.os,
    browser: r.browser,
    country: r.country,
    remember: r.remember,
    signedInAt: r.signed_in_at,
    lastActiveAt: r.last_active_at,
    isCurrent: r.is_current,
  }));
}

/**
 * Sign one other device out. It can no longer refresh its session, and the
 * portal gate refuses its current token at its next check (within the hour,
 * immediately if it is opened).
 */
export async function revokeMySession(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_my_session', { p_session_id: sessionId });
  if (error) throw new Error('We could not sign that device out. Please try again.');
}

/** Sign every device out except this one. Resolves to how many were signed out. */
export async function revokeMyOtherSessions(): Promise<number> {
  const { data, error } = await supabase.rpc('revoke_my_other_sessions');
  if (error) throw new Error('We could not sign your other devices out. Please try again.');
  return typeof data === 'number' ? data : 0;
}
