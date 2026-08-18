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
