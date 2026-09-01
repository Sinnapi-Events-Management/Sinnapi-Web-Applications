'use client';
import { useCallback, useMemo } from 'react';
import { Alert, Box } from '@mui/material';
import { groupMessagesByDay } from '../format';
import { ThreadSkeleton } from '../atoms/ThreadSkeleton';
import { ThreadEmptyState } from '../atoms/ThreadEmptyState';
import { JumpToLatest } from '../molecules/JumpToLatest';
import { TypingBubble } from '../molecules/TypingBubble';
import { ConversationAvatar, ConversationAvatarSpacer } from '../molecules/ConversationAvatar';
import { MessageDayGroup } from './MessageDayGroup';
import { useThreadScroll } from '../hooks/useThreadScroll';
import type { MessagingAudience } from '../conversationType';
import type { MessageAttachmentView, MessageView } from '../types';

/** Avatar size in the thread gutter — small enough to read as a marker, not a portrait. */
const GUTTER_AVATAR_PX = 28;

export type MessageThreadProps = {
  messages: MessageView[];
  currentUserId: string | undefined;
  isLoading: boolean;
  error: unknown;
  /** Conversation id — changing it re-pins the scroll to the newest message. */
  scrollKey?: string;
  audience: MessagingAudience;
  /** Counterparty display name and type, for the incoming avatar. */
  counterpartyName?: string;
  counterpartyType?: string;
  counterpartyAvatarUrl?: string | null;
  /** Names of people typing right now; renders a ghost bubble at the foot. */
  typingNames?: string[];
  onOpenAttachment?: (attachment: MessageAttachmentView) => Promise<void>;
  onRetry?: (message: MessageView) => void;
  /** Notified when the newest message becomes visible, to stamp the read receipt. */
  onReachBottom?: () => void;
  emptyHint?: string;
};

/**
 * The scrollable message history.
 *
 * Structure only. `useThreadScroll` owns every piece of behaviour that makes a
 * chat feel like one — following the newest message, holding position while the
 * reader scrolls back, counting what they missed, and firing the read receipt
 * only once the newest message is genuinely on screen. `MessageDayGroup` owns
 * the reading rhythm inside a day. What is left here is the one thing that has
 * to live at this level: a single scroll container, so the page and the thread
 * never both scroll and the reader gets whichever one their thumb is over.
 *
 * THE STREAM IS BOTTOM-ANCHORED. A thread shorter than its pane used to stack
 * from the top, leaving a slab of empty card between the newest message and the
 * composer — the reader's eye lands on the gap, and a three-message
 * conversation looks abandoned rather than new. `mt: auto` on the list pushes a
 * short history down onto the composer, which is where forty years of messaging
 * UI have taught people the live end of a conversation lives, and does nothing
 * at all once the content is tall enough to scroll.
 */
export function MessageThread({
  messages,
  currentUserId,
  isLoading,
  error,
  scrollKey,
  audience,
  counterpartyName,
  counterpartyType = 'client_vendor',
  counterpartyAvatarUrl,
  typingNames = [],
  onOpenAttachment,
  onRetry,
  onReachBottom,
  emptyHint = 'No messages yet — say hello 👋',
}: MessageThreadProps) {
  const groups = useMemo(() => groupMessagesByDay(messages), [messages]);
  const newest = messages[messages.length - 1];

  const { scrollRef, bottomRef, atBottom, missed, handleScroll, scrollToBottom } = useThreadScroll({
    messageCount: messages.length,
    newestSenderId: newest?.senderId,
    currentUserId,
    scrollKey,
    onReachBottom,
  });

  const counterpartyAvatar = useMemo(
    () => (
      <ConversationAvatar
        title={counterpartyName ?? 'Conversation'}
        type={counterpartyType}
        audience={audience}
        avatarUrl={counterpartyAvatarUrl}
        size={GUTTER_AVATAR_PX}
        showBadge={false}
      />
    ),
    [counterpartyName, counterpartyType, audience, counterpartyAvatarUrl],
  );

  // Mid-turn bubbles drop the avatar but keep its column, or a run of replies
  // marches leftward up the thread.
  const renderAvatar = useCallback(
    (opensTurn: boolean) =>
      opensTurn ? counterpartyAvatar : <ConversationAvatarSpacer size={GUTTER_AVATAR_PX} />,
    [counterpartyAvatar],
  );

  if (isLoading) return <ThreadSkeleton />;

  if (error) {
    return (
      <Alert severity="error">
        {error instanceof Error ? error.message : 'Could not load this conversation.'}
      </Alert>
    );
  }

  if (messages.length === 0 && typingNames.length === 0) {
    return <ThreadEmptyState hint={emptyHint} />;
  }

  return (
    <Box sx={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex' }}>
      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          px: 0.5,
          // The column is what lets `mt: auto` below bottom-anchor a short
          // history without breaking scrolling on a long one.
          display: 'flex',
          flexDirection: 'column',
          scrollbarWidth: 'thin',
          overscrollBehavior: 'contain',
        }}
      >
        <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, mt: 'auto', width: '100%' }}>
          {groups.map((group) => (
            <Box component="li" key={group.key} sx={{ listStyle: 'none' }}>
              <MessageDayGroup
                label={group.label}
                items={group.items}
                currentUserId={currentUserId}
                renderAvatar={renderAvatar}
                onOpenAttachment={onOpenAttachment}
                onRetry={onRetry}
              />
            </Box>
          ))}

          {typingNames.length > 0 && <TypingBubble avatar={counterpartyAvatar} />}
        </Box>

        <div ref={bottomRef} />
      </Box>

      {!atBottom && <JumpToLatest missed={missed} onJump={() => scrollToBottom()} />}
    </Box>
  );
}
