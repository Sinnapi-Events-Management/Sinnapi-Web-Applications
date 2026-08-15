'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Stack, Typography, Skeleton, Alert, Fab, Chip } from '@mui/material';
import ForumIcon from '@mui/icons-material/Forum';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { groupMessagesByDay } from '../format';
import { DayDivider } from '../atoms/DayDivider';
import { TypingDots } from '../atoms/TypingDots';
import { MessageBubble } from '../molecules/MessageBubble';
import { SystemMessage } from '../molecules/SystemMessage';
import { ConversationAvatar, ConversationAvatarSpacer } from '../molecules/ConversationAvatar';
import type { MessagingAudience } from '../conversationType';
import type { MessageAttachmentView, MessageView } from '../types';

/** Consecutive messages from one sender inside this window render as one turn. */
const GROUPING_WINDOW_MS = 5 * 60 * 1000;

/** How close to the bottom still counts as "following the conversation". */
const STICK_TO_BOTTOM_PX = 120;

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

function ThreadSkeleton() {
  // Alternating widths and sides read as a conversation rather than a list.
  const rows = [
    { mine: false, w: '60%' },
    { mine: true, w: '45%' },
    { mine: false, w: '70%' },
    { mine: true, w: '35%' },
    { mine: false, w: '52%' },
  ];
  return (
    <Stack spacing={1.5} sx={{ py: 1 }}>
      {rows.map((r, i) => (
        <Box key={i} sx={{ display: 'flex', justifyContent: r.mine ? 'flex-end' : 'flex-start' }}>
          <Skeleton variant="rounded" width={r.w} height={44} sx={{ borderRadius: 2.5 }} />
        </Box>
      ))}
    </Stack>
  );
}

/**
 * The scrollable message history.
 *
 * SCROLL BEHAVIOUR is the whole reason this owns its own scroll container
 * rather than letting the page scroll. A chat that jumps to the bottom on every
 * arrival makes it impossible to read back through a thread while the other
 * person is still writing — the view yanks away mid-sentence. So:
 *
 *   * arriving messages auto-scroll only when the reader is already at the
 *     bottom (within STICK_TO_BOTTOM_PX);
 *   * a reader who has scrolled up stays exactly where they are, and gets a
 *     jump-to-latest button carrying the count of what they have missed;
 *   * switching conversations always re-pins, because that is a new context
 *     and the newest message is what you came for.
 *
 * The read receipt fires from the same signal: `onReachBottom` is called when
 * the newest message is genuinely on screen, not when the thread merely
 * mounted. Marking a 200-message thread read because it loaded — while the
 * reader sits at the top of it — is how unread counts stop meaning anything.
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [missed, setMissed] = useState(0);
  const lastCount = useRef(messages.length);

  const groups = useMemo(() => groupMessagesByDay(messages), [messages]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ block: 'end', behavior });
  }, []);

  // Track whether the reader is following the conversation or reading back.
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = distance <= STICK_TO_BOTTOM_PX;
    setAtBottom(near);
    if (near) setMissed(0);
  }, []);

  // New arrivals: follow, or count them for the jump button.
  useEffect(() => {
    const grew = messages.length - lastCount.current;
    lastCount.current = messages.length;
    if (grew <= 0) return;

    const newest = messages[messages.length - 1];
    // Your own send always scrolls into view — you just asked for it, and
    // leaving the sender staring at old messages after hitting send is worse
    // than interrupting their scroll-back.
    if (atBottom || newest?.senderId === currentUserId) scrollToBottom();
    else setMissed((n) => n + grew);
  }, [messages, atBottom, currentUserId, scrollToBottom]);

  // A different conversation is a fresh context; jump without animating.
  useEffect(() => {
    setMissed(0);
    setAtBottom(true);
    // Waits a frame so the new thread's rows have laid out and the container
    // has its real height to scroll within.
    const id = requestAnimationFrame(() => scrollToBottom('auto'));
    return () => cancelAnimationFrame(id);
  }, [scrollKey, scrollToBottom]);

  // Read receipt: only once the newest message is actually visible.
  useEffect(() => {
    if (atBottom && messages.length > 0) onReachBottom?.();
  }, [atBottom, messages.length, onReachBottom]);

  if (isLoading) return <ThreadSkeleton />;

  if (error) {
    return (
      <Alert severity="error">
        {error instanceof Error ? error.message : 'Could not load this conversation.'}
      </Alert>
    );
  }

  if (messages.length === 0 && typingNames.length === 0) {
    return (
      <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ flex: 1, py: 6 }}>
        <ForumIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          {emptyHint}
        </Typography>
      </Stack>
    );
  }

  return (
    <Box sx={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex' }}>
      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', px: 0.5 }}
      >
        <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {groups.map((group) => (
            <Box component="li" key={group.key} sx={{ listStyle: 'none' }}>
              <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                <DayDivider label={group.label} />
                {group.items.map((m, i) => {
                  if (m.isSystem) return <SystemMessage key={m.id} message={m} />;

                  const mine = m.senderId === currentUserId;
                  const prev = group.items[i - 1];
                  const grouped =
                    !!prev &&
                    !prev.isSystem &&
                    prev.senderId === m.senderId &&
                    !!prev.createdAt &&
                    !!m.createdAt &&
                    new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() <
                      GROUPING_WINDOW_MS;

                  return (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      mine={mine}
                      grouped={grouped}
                      onOpenAttachment={onOpenAttachment}
                      onRetry={onRetry}
                      avatar={
                        grouped ? (
                          <ConversationAvatarSpacer size={28} />
                        ) : (
                          <ConversationAvatar
                            title={counterpartyName ?? 'Conversation'}
                            type={counterpartyType}
                            audience={audience}
                            avatarUrl={counterpartyAvatarUrl}
                            size={28}
                          />
                        )
                      }
                    />
                  );
                })}
              </Box>
            </Box>
          ))}

          {typingNames.length > 0 && (
            <Box
              component="li"
              sx={{ listStyle: 'none', display: 'flex', alignItems: 'center', gap: 1, mt: 1.25 }}
            >
              <ConversationAvatar
                title={counterpartyName ?? 'Conversation'}
                type={counterpartyType}
                audience={audience}
                avatarUrl={counterpartyAvatarUrl}
                size={28}
              />
              <Box
                sx={{
                  px: 1.75,
                  py: 1.25,
                  borderRadius: 2.5,
                  borderBottomLeftRadius: 0.5,
                  bgcolor: (t) =>
                    `rgba(${t.palette.mode === 'dark' ? '255,255,255' : '0,0,0'},0.07)`,
                }}
              >
                <TypingDots />
              </Box>
            </Box>
          )}
        </Box>

        <div ref={bottomRef} />
      </Box>

      {/* Only offered when there is genuinely something below the fold. A
          permanent jump button trains people to ignore it. */}
      {!atBottom && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 12,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {missed > 0 ? (
            <Chip
              color="primary"
              clickable
              onClick={() => scrollToBottom()}
              icon={<KeyboardArrowDownIcon />}
              label={`${missed} new ${missed === 1 ? 'message' : 'messages'}`}
              sx={{ boxShadow: 3, fontWeight: 600 }}
            />
          ) : (
            <Fab
              size="small"
              onClick={() => scrollToBottom()}
              aria-label="Jump to latest message"
              sx={{ bgcolor: 'background.paper', color: 'text.secondary', boxShadow: 3 }}
            >
              <KeyboardArrowDownIcon />
            </Fab>
          )}
        </Box>
      )}
    </Box>
  );
}
