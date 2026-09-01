/**
 * The shape the messaging kit renders.
 *
 * These are *view* types, not row types. Each portal reads `conversations` and
 * `messages` with its own select list and its own relation quirks (the embedded
 * `vendors` that Supabase types as an array of at most one, the per-portal
 * `ConversationModel`), and normalises into these before rendering. That
 * normalisation is the seam: it keeps `one<VendorRef>()` and column names out of
 * the components, so a select-list change is a hook edit rather than a sweep
 * through the UI.
 */

/** `conversation_type` — who the two participants are. */
export type ConversationType = 'client_vendor' | 'vendor_admin' | 'client_admin';

/** `conversation_status`. */
export type ConversationStatus = 'active' | 'archived' | 'blocked';

/** `message_moderation`. */
export type MessageModeration = 'clean' | 'flagged' | 'blocked' | 'pending';

/** `scan_status` on an attachment. */
export type AttachmentScanStatus = 'pending' | 'clean' | 'infected';

export type MessageAttachmentView = {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  scanStatus: AttachmentScanStatus;
};

export type MessageView = {
  id: string;
  senderId: string;
  body: string | null;
  createdAt: string | null;
  editedAt: string | null;
  isSystem: boolean;
  moderationStatus: MessageModeration;
  attachments: MessageAttachmentView[];
  /**
   * Set on messages the composer has queued but the server has not yet
   * acknowledged. Drives the "sending…" tick and the retry affordance; a row
   * that came back from the database never carries it.
   */
  pending?: boolean;
  /** Populated instead of `pending` when a queued send failed. */
  failed?: boolean;
};

export type ConversationView = {
  id: string;
  /** Counterparty name where known, else the subject, else the type label. */
  title: string;
  subject: string | null;
  type: string;
  status: string;
  lastMessageAt: string | null;
  createdAt: string | null;
  /** Snippet of the newest message, from `conversations.last_message_preview`. */
  preview: string | null;
  /** True when the newest message is the viewer's own — renders as "You: …". */
  previewIsMine: boolean;
  unreadCount: number;
  muted: boolean;
  /** Avatar image for the counterparty, when the portal can resolve one. */
  avatarUrl?: string | null;
  /**
   * The other participant's profile id, from `get_my_conversations`.
   *
   * Optional because the inbox never needed it — a list of threads is rendered
   * by name. It exists for the callers that arrive from the other direction: a
   * quotation page holding a `client_id` and asking "is there already a thread
   * with this person", which is a match on the id and cannot be a match on the
   * name.
   */
  counterpartyId?: string | null;
  /**
   * `conversations.vendor_id` on a `client_vendor` thread.
   *
   * The client's half of the same problem `counterpartyId` solves. A client
   * arriving from a quotation holds a *vendor* id, not the profile id of
   * whoever owns that business — `vendors.owner_id` is not a column any client
   * screen reads, and `profiles_self_read` would not disclose the name behind
   * it. This is the key `get_or_create_client_vendor_conversation` itself
   * matches on, so a thread found by it here is the row that RPC would return.
   */
  vendorId?: string | null;
};

/** A participant seen as present on the conversation's realtime channel. */
export type PresentParticipant = {
  profileId: string;
  /** True while they have the composer focused with a non-empty draft. */
  typing: boolean;
};
