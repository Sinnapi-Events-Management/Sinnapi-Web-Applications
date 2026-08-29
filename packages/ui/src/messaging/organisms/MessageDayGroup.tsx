'use client';
import { Box } from '@mui/material';
import { DayDivider } from '../atoms/DayDivider';
import { MessageBubble } from '../molecules/MessageBubble';
import { SystemMessage } from '../molecules/SystemMessage';
import { isSameTurn } from '../format';
import type { MessageAttachmentView, MessageView } from '../types';

export type MessageDayGroupProps = {
  label: string;
  items: MessageView[];
  currentUserId: string | undefined;
  /**
   * Rendered beside the first bubble of each incoming turn. A function rather
   * than a node so the group never has to know what an avatar is — it only
   * knows whether this bubble opens a turn.
   */
  renderAvatar: (opensTurn: boolean) => React.ReactNode;
  onOpenAttachment?: (attachment: MessageAttachmentView) => Promise<void>;
  onRetry?: (message: MessageView) => void;
};

/**
 * One calendar day of a thread: its divider, then its messages.
 *
 * Split out of `MessageThread` so the thread owns scrolling and this owns
 * reading rhythm — turn detection, the avatar gutter, and where a system notice
 * interrupts the two sides. Both are easier to change without breaking the
 * other, and the day group is what a virtualized thread would render per row.
 */
export function MessageDayGroup({
  label,
  items,
  currentUserId,
  renderAvatar,
  onOpenAttachment,
  onRetry,
}: MessageDayGroupProps) {
  return (
    <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      <DayDivider label={label} />

      {items.map((m, i) => {
        if (m.isSystem) return <SystemMessage key={m.id} message={m} />;

        const grouped = isSameTurn(items[i - 1], m);

        return (
          <MessageBubble
            key={m.id}
            message={m}
            mine={m.senderId === currentUserId}
            grouped={grouped}
            onOpenAttachment={onOpenAttachment}
            onRetry={onRetry}
            avatar={renderAvatar(!grouped)}
          />
        );
      })}
    </Box>
  );
}
