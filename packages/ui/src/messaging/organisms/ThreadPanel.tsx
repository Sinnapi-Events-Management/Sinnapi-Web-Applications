'use client';
import { Box, Stack, Typography } from '@mui/material';
import ForumIcon from '@mui/icons-material/Forum';
import { ThreadHeader, type ThreadHeaderAction } from '../molecules/ThreadHeader';
import { MessageThread } from './MessageThread';
import { ThreadComposer } from './ThreadComposer';
import type { PendingAttachment } from '../molecules/ComposerAttachmentTray';
import type { MessagingAudience } from '../conversationType';
import type { ConversationView, MessageAttachmentView, MessageView } from '../types';

export type ThreadPanelProps = {
  conversation: ConversationView | null;
  audience: MessagingAudience;
  messages: MessageView[];
  currentUserId: string | undefined;
  isLoading: boolean;
  error: unknown;

  onSend: (body: string, attachments: PendingAttachment[]) => Promise<void>;
  onTypingChange?: (typing: boolean) => void;
  onReachBottom?: () => void;
  onOpenAttachment?: (attachment: MessageAttachmentView) => Promise<void>;
  onRetry?: (message: MessageView) => void;

  attachments?: PendingAttachment[];
  onAttachFiles?: (files: File[]) => void;
  onRemoveAttachment?: (id: string) => void;

  online?: boolean;
  typingNames?: string[];

  onClose?: () => void;
  onToggleMute?: (muted: boolean) => void;
  onToggleArchive?: (archived: boolean) => void;
  extraActions?: ThreadHeaderAction[];
  headerChildren?: React.ReactNode;
  /**
   * Replaces the composer entirely. For the case where the viewer *could* be
   * given a composer but has to do something first — an admin who oversees a
   * support thread without being in it, and must join before replying. A
   * `disabledReason` would be wrong there: the point is to offer the action,
   * not to explain an absence.
   */
  composerSlot?: React.ReactNode;
  /** Rendered above the thread — banners that apply to the whole conversation. */
  banner?: React.ReactNode;

  /** Shown in the desktop detail column before a conversation is picked. */
  placeholderTitle?: string;
  placeholderDescription?: string;
  emptyHint?: string;
};

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ flex: 1, py: 8 }}>
      <ForumIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
      <Typography variant="h6">{title}</Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: 'center', maxWidth: 320 }}
      >
        {description}
      </Typography>
    </Stack>
  );
}

/**
 * A whole conversation: header, scrollable history, composer.
 *
 * Composed here rather than in each portal because the three pieces have real
 * constraints on each other — the header and composer are fixed while only the
 * thread scrolls, and the thread needs a bounded height to anchor against.
 * Reassembling that in three places is how one portal ends up with a composer
 * that scrolls away mid-conversation.
 *
 * REPLYING IS CLOSED on archived and blocked threads. That is now enforced by
 * RLS too (0815d), but the composer explains it rather than letting the user
 * type a paragraph and discover the refusal on send.
 */
export function ThreadPanel({
  conversation,
  audience,
  messages,
  currentUserId,
  isLoading,
  error,
  onSend,
  onTypingChange,
  onReachBottom,
  onOpenAttachment,
  onRetry,
  attachments,
  onAttachFiles,
  onRemoveAttachment,
  online,
  typingNames,
  onClose,
  onToggleMute,
  onToggleArchive,
  extraActions,
  headerChildren,
  composerSlot,
  banner,
  placeholderTitle = 'Select a conversation',
  placeholderDescription = 'Pick a thread on the left to read its history and reply.',
  emptyHint,
}: ThreadPanelProps) {
  if (!conversation) {
    return <Placeholder title={placeholderTitle} description={placeholderDescription} />;
  }

  const disabledReason =
    conversation.status === 'blocked'
      ? 'This conversation has been blocked by Sinnapi. Replies are disabled.'
      : conversation.status === 'archived'
        ? 'This conversation is archived. Move it back to active to reply.'
        : null;

  return (
    <Stack sx={{ height: '100%', minHeight: 0 }}>
      <ThreadHeader
        conversation={conversation}
        audience={audience}
        online={online}
        typingNames={typingNames}
        onClose={onClose}
        onToggleMute={onToggleMute}
        onToggleArchive={onToggleArchive}
        extraActions={extraActions}
      >
        {headerChildren}
      </ThreadHeader>

      {banner && <Box sx={{ pt: 1.5 }}>{banner}</Box>}

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', py: 1.5 }}>
        <MessageThread
          messages={messages}
          currentUserId={currentUserId}
          isLoading={isLoading}
          error={error}
          scrollKey={conversation.id}
          audience={audience}
          counterpartyName={conversation.title}
          counterpartyType={conversation.type}
          counterpartyAvatarUrl={conversation.avatarUrl}
          typingNames={typingNames}
          onOpenAttachment={onOpenAttachment}
          onRetry={onRetry}
          onReachBottom={onReachBottom}
          emptyHint={emptyHint}
        />
      </Box>

      <Box sx={{ pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
        {composerSlot ?? (
          <ThreadComposer
            onSend={onSend}
            onTypingChange={onTypingChange}
            attachments={attachments}
            onAttachFiles={onAttachFiles}
            onRemoveAttachment={onRemoveAttachment}
            disabledReason={disabledReason}
          />
        )}
      </Box>
    </Stack>
  );
}
