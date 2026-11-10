/**
 * The contracts the settings kit is driven by.
 *
 * Every one of these is a plain value or a promise-returning callback: no
 * Supabase client is imported anywhere in this module, for the same reason as
 * the messaging kit. The two portals talk to the same project through their own
 * clients (distinct `storageKey`s, distinct portal gates), so the data layer is
 * theirs to own and only the shapes are shared.
 */

/** `erasure_status` in the database, in the order a request moves through it. */
export type DeletionRequestStatus =
  | 'requested'
  | 'reviewing'
  | 'approved'
  | 'partially_fulfilled'
  | 'rejected'
  | 'completed';

/** The user's most recent erasure request, as the settings page needs it. */
export type DeletionRequestSummary = {
  id: string;
  status: DeletionRequestStatus;
  /** ISO timestamp — formatted by the portal's locale at render time. */
  createdAt: string;
};

/**
 * What a password change needs from the user. The current password is required
 * because the portals verify it before the write: an unlocked laptop should not
 * be enough to take an account over.
 */
export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

/** Signature of the portal-supplied password write. Rejects with a readable message. */
export type ChangePasswordHandler = (input: ChangePasswordInput) => Promise<void>;

/** Signature of the portal-supplied export. Resolves once the file has been handed to the browser. */
export type ExportDataHandler = () => Promise<void>;

/** Signature of the portal-supplied erasure request. `reason` is the user's own words. */
export type RequestDeletionHandler = (reason: string) => Promise<void>;

/**
 * Re-confirm the signed-in person's password (step-up). Resolves once the
 * server has recorded the confirmation for THIS session; rejects with a
 * readable message (wrong password, too many attempts, no connection).
 */
export type ConfirmPasswordHandler = (password: string) => Promise<void>;

/** One live session of the signed-in account, as "Where you're signed in" lists it. */
export type SignedInSession = {
  id: string;
  /** Which app admitted it — null for a session recorded before this existed. */
  portal: 'client' | 'vendor' | 'admin' | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  /** Two-letter country code from the network edge, when known. */
  country: string | null;
  /** False when "Keep me signed in" was unticked — it ends within 12 hours. */
  remember: boolean;
  /** ISO timestamps; formatted by the portal at render time. */
  signedInAt: string;
  lastActiveAt: string;
  /** The session this page is running in. */
  isCurrent: boolean;
};

export type ListSessionsHandler = () => Promise<SignedInSession[]>;
export type RevokeSessionHandler = (sessionId: string) => Promise<void>;
/** Resolves to how many other sessions were signed out. */
export type RevokeOtherSessionsHandler = () => Promise<number>;
