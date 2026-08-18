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
};

/** A participant seen as present on the conversation's realtime channel. */
export type PresentParticipant = {
  profileId: string;
  /** True while they have the composer focused with a non-empty draft. */
  typing: boolean;
};
