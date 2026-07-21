import { useEffect, useMemo, useRef } from 'react';
import { Box, Stack, Chip, Typography, Skeleton, Alert } from '@sinnapi/ui';
import ForumIcon from '@mui/icons-material/Forum';
import { formatDate } from '@/lib/config';
import type { MessageModel } from '@/lib/types';
import MessageBubble from './MessageBubble';

type Props = {
  messages: MessageModel[];
  /** Bubbles from this profile render as "mine". */
  currentUserId: string | undefined;
  isLoading: boolean;
  error: unknown;
  /** Scroll anchor key — pass the conversation id so switching threads re-pins. */
  scrollKey?: string;
};

/** Groups consecutive messages under the calendar day they were sent. */
function groupByDay(messages: MessageModel[]) {
  const groups: { day: string; label: string; items: MessageModel[] }[] = [];
  for (const m of messages) {
    const day = m.created_at ? new Date(m.created_at).toDateString() : 'unknown';
    const last = groups[groups.length - 1];
    if (last?.day === day) last.items.push(m);
    else groups.push({ day, label: formatDate(m.created_at), items: [m] });
  }
  return groups;
}

function ThreadSkeleton() {
  // Alternating widths/sides read as a conversation rather than a loading list.
  const rows = [
    { mine: false, w: '60%' },
    { mine: true, w: '45%' },
    { mine: false, w: '70%' },
    { mine: true, w: '35%' },
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
 * Scrollable message history: day dividers, ownership-aware bubbles and the
 * loading / error / empty states. Shared by the inbox thread pane and the
 * standalone conversation route so both render a thread identically.
 */
export default function MessageThread({
  messages,
  currentUserId,
  isLoading,
  error,
  scrollKey,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => groupByDay(messages), [messages]);

  // Pin to the newest message on load and whenever the thread grows or changes.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, scrollKey]);

  if (isLoading) return <ThreadSkeleton />;

  if (error) {
    return (
      <Alert severity="error">
        {error instanceof Error ? error.message : 'Could not load this conversation.'}
      </Alert>
    );
  }

  if (messages.length === 0) {
    return (
      <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ flex: 1, py: 6 }}>
        <ForumIcon sx={{ fontSize: 40, color: 'grey.400' }} />
        <Typography variant="body2" color="text.secondary">
          No messages yet — say hello 👋
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ flex: 1 }}>
      {groups.map((g) => (
        <Stack key={g.day} spacing={1.25}>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Chip label={g.label} size="small" variant="outlined" sx={{ fontSize: 11 }} />
          </Box>
          {g.items.map((m) => (
            <MessageBubble key={m.id} message={m} mine={m.sender_id === currentUserId} />
          ))}
        </Stack>
      ))}
      <div ref={bottomRef} />
    </Stack>
  );
}
