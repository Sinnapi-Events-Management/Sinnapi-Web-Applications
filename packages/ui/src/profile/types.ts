/**
 * The contracts the profile kit is driven by.
 *
 * No Supabase client is imported anywhere in this module, for the same reason as
 * the settings and messaging kits: the portals share one Supabase project but not
 * one session (each has its own `storageKey` and its own portal gate), so the
 * data layer stays the portal's and only the shapes are shared.
 *
 * The split below is the whole point of the kit. `ObjectStoragePort` is a thin,
 * mechanical shim over whatever the portal's client offers — a dozen lines it can
 * write without thinking. Everything genuinely easy to get wrong (validation,
 * squaring, preview lifecycle, key construction, orphan cleanup, ordering of the
 * commit against the upload) lives in `useProfileImageUpload` and therefore
 * exists once for all three portals.
 */

/** A bucket-scoped view of object storage, as the upload hook needs it. */
export type ObjectStoragePort = {
  /** Upload `blob` to `path`, overwriting. Rejects with a readable message. */
  upload: (path: string, blob: Blob) => Promise<void>;
  /** The public URL an uploaded `path` is served from. */
  publicUrl: (path: string) => string;
  /** Best-effort delete. Must not reject — a failed cleanup is not a failed save. */
  remove: (paths: string[]) => Promise<void>;
};

/**
 * Which record the picked image belongs to, and where its bytes go.
 *
 * `currentUrl` is what lets the hook delete the outgoing object after a
 * successful swap; pass the value straight from the query that renders the card
 * so cleanup always targets the image actually being replaced.
 */
export type ProfileImageTarget = {
  /** Bucket name — also how a stored public URL is mapped back to an object key. */
  bucket: string;
  /**
   * The owning entity's id: a user id for an avatar, a vendor id for a business
   * logo. Null means the session is gone, which the hook reports rather than
   * uploading to a path no policy will accept.
   */
  ownerId: string | null;
  /** Filename stem within the owner's folder, e.g. `avatar` or `logo`. */
  slug: string;
  /** The currently stored public URL, or null when there is no image yet. */
  currentUrl: string | null;
};

/** Success copy for the two outcomes, so each surface can word its own toast. */
export type ProfileImageMessages = {
  updated: string;
  removed: string;
};

/**
 * One entry in a `ProfileTabs` bar. `icon` is a `ReactElement` rather than a
 * `ReactNode` because that is what MUI's `Tab` accepts — it clones the element to
 * position it against the label.
 */
export type ProfileTabItem<T extends string> = {
  value: T;
  label: string;
  icon?: React.ReactElement;
};

/** One read-only row in an `AccountFactsCard`. */
export type AccountFact = {
  /** Stable key — the label is display copy and may be translated later. */
  key: string;
  label: string;
  value?: React.ReactNode;
  icon?: React.ReactNode;
  /** When set, the row offers a copy-to-clipboard affordance. */
  copyValue?: string;
  /** Render the value in a monospace face (ids, references). */
  mono?: boolean;
};
