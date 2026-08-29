'use client';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/** How close to the bottom still counts as "following the conversation". */
export const STICK_TO_BOTTOM_PX = 120;

export type UseThreadScrollOptions = {
  /** Length of the rendered message list — the only thing that drives following. */
  messageCount: number;
  /** Sender of the newest message, so your own send always scrolls into view. */
  newestSenderId?: string | null;
  currentUserId?: string;
  /** Conversation id — changing it re-pins the scroll to the newest message. */
  scrollKey?: string;
  /** Notified when the newest message is genuinely visible, to stamp the read receipt. */
  onReachBottom?: () => void;
  stickToBottomPx?: number;
};

export type ThreadScroll = {
  /** Attach to the scroll container; `handleScroll` must be its `onScroll`. */
  scrollRef: RefObject<HTMLDivElement>;
  /** Attach to a zero-height sentinel as the container's last child. */
  bottomRef: RefObject<HTMLDivElement>;
  /** Whether the reader is following the conversation rather than reading back. */
  atBottom: boolean;
  /** Messages that arrived while they were reading back. */
  missed: number;
  handleScroll: () => void;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
};

/**
 * Scroll ownership for a message thread.
 *
 * Extracted from `MessageThread` so the component is structure and this is
 * behaviour — the four rules below are the entire reason a chat needs its own
 * scroller, and they are far easier to reason about (and to reuse in a future
 * virtualized list) away from the JSX.
 *
 *   * arriving messages auto-scroll only when the reader is already at the
 *     bottom (within `stickToBottomPx`);
 *   * a reader who has scrolled up stays exactly where they are, and gets a
 *     jump-to-latest affordance carrying the count of what they have missed;
 *   * your own send always scrolls into view — you just asked for it, and
 *     leaving the sender staring at old messages is worse than interrupting
 *     their scroll-back;
 *   * switching conversations always re-pins, because that is a new context and
 *     the newest message is what you came for.
 *
 * The read receipt fires from the same signal: `onReachBottom` is called when
 * the newest message is actually on screen, not when the thread merely mounted.
 * Marking a 200-message thread read because it loaded — while the reader sits
 * at the top of it — is how unread counts stop meaning anything.
 */
export function useThreadScroll({
  messageCount,
  newestSenderId,
  currentUserId,
  scrollKey,
  onReachBottom,
  stickToBottomPx = STICK_TO_BOTTOM_PX,
}: UseThreadScrollOptions): ThreadScroll {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [missed, setMissed] = useState(0);
  const lastCount = useRef(messageCount);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ block: 'end', behavior });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = distance <= stickToBottomPx;
    setAtBottom(near);
    if (near) setMissed(0);
  }, [stickToBottomPx]);

  // New arrivals: follow, or count them for the jump affordance.
  useEffect(() => {
    const grew = messageCount - lastCount.current;
    lastCount.current = messageCount;
    if (grew <= 0) return;
    if (atBottom || (!!newestSenderId && newestSenderId === currentUserId)) scrollToBottom();
    else setMissed((n) => n + grew);
  }, [messageCount, newestSenderId, atBottom, currentUserId, scrollToBottom]);

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
    if (atBottom && messageCount > 0) onReachBottom?.();
  }, [atBottom, messageCount, onReachBottom]);

  return { scrollRef, bottomRef, atBottom, missed, handleScroll, scrollToBottom };
}
