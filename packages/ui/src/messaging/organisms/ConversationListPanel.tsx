'use client';
import { Stack, Alert, Box, Typography, Button } from '@mui/material';
import ForumIcon from '@mui/icons-material/Forum';
import { ConversationRow, ConversationRowSkeleton } from '../molecules/ConversationRow';
import type { MessagingAudience } from '../conversationType';
import type { ConversationView } from '../types';

export type ConversationListPanelProps = {
  rows: ConversationView[];
  audience: MessagingAudience;
  isLoading: boolean;
  error: unknown;
  activeId: string | null;
  onOpen: (id: string) => void;
  /** Conversation ids with someone typing right now. */
  typingIn?: Set<string>;
  /** True when filters emptied the list, rather than the inbox being empty. */
  isFiltered: boolean;
  onClearFilters?: () => void;
  showTypeChip?: boolean;
  /** Copy and action for a genuinely empty inbox. */
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
};

function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Stack alignItems="center" spacing={1.5} sx={{ py: 6, px: 2, textAlign: 'center' }}>
      <ForumIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
        {description}
      </Typography>
      {action}
    </Stack>
  );
}

/**
 * The master column: loading, error, empty and list states for an inbox.
 *
 * Thin and presentational — every filter and the active row live in the calling
 * page's hooks. The one piece of judgement it keeps is distinguishing "you
 * filtered everything out" from "there is nothing here", because those need
 * opposite affordances: one wants its filters cleared, the other wants a way to
 * start a conversation, and offering the wrong one is a dead end.
 */
export function ConversationListPanel({
  rows,
  audience,
  isLoading,
  error,
  activeId,
  onOpen,
  typingIn,
  isFiltered,
  onClearFilters,
  showTypeChip = true,
  emptyTitle = 'No conversations yet',
  emptyDescription = 'Your messages will appear here.',
  emptyAction,
}: ConversationListPanelProps) {
  if (isLoading) {
    return (
      <Stack spacing={1.25}>
        {Array.from({ length: 6 }).map((_, i) => (
          <ConversationRowSkeleton key={i} />
        ))}
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {error instanceof Error ? error.message : 'Something went wrong loading your messages.'}
      </Alert>
    );
  }

  if (rows.length === 0) {
    return isFiltered ? (
      <Empty
        title="No matching conversations"
        description="Try a different status, type or search term."
        action={
          onClearFilters && (
            <Button size="small" onClick={onClearFilters}>
              Clear filters
            </Button>
          )
        }
      />
    ) : (
      <Empty title={emptyTitle} description={emptyDescription} action={emptyAction} />
    );
  }

  return (
    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      <Stack spacing={1.25}>
        {rows.map((c) => (
          <Box component="li" key={c.id} sx={{ listStyle: 'none' }}>
            <ConversationRow
              conversation={c}
              audience={audience}
              active={c.id === activeId}
              onOpen={onOpen}
              typing={typingIn?.has(c.id)}
              showTypeChip={showTypeChip}
            />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
