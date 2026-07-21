import { Stack, Alert } from '@sinnapi/ui';
import EmptyState from '@/components/ui/EmptyState';
import ConversationListItem from '../molecules/ConversationListItem';
import ConversationListItemSkeleton from '../molecules/ConversationListItemSkeleton';
import type { ConversationView } from '../../hooks/useMessages';
import type { ActiveConversationState } from '../../hooks/useActiveConversation';

type Props = {
  rows: ConversationView[];
  isLoading: boolean;
  error: unknown;
  /** True when filters emptied the list, rather than the inbox being empty. */
  isFiltered: boolean;
  active: ActiveConversationState;
};

/**
 * The master column: loading / error / empty / list states for the inbox. Thin
 * and presentational — the active row and every filter live in the page's hooks.
 */
export default function ConversationList({ rows, isLoading, error, isFiltered, active }: Props) {
  if (isLoading) {
    return (
      <Stack spacing={1.25}>
        {Array.from({ length: 6 }).map((_, i) => (
          <ConversationListItemSkeleton key={i} />
        ))}
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {error instanceof Error ? error.message : 'Something went wrong.'}
      </Alert>
    );
  }

  if (rows.length === 0) {
    // Distinguish "you filtered everything out" from "there is nothing here",
    // so the CTA only appears when starting a conversation is the real fix.
    return isFiltered ? (
      <EmptyState
        title="No matching conversations"
        description="Try a different status, type or search term."
      />
    ) : (
      <EmptyState
        title="No conversations yet"
        description="Vendor and client threads appear here. Open a vendor to start one."
        ctaLabel="Browse vendors"
        ctaHref="/vendors"
      />
    );
  }

  return (
    <Stack spacing={1.25}>
      {rows.map((c) => (
        <ConversationListItem
          key={c.id}
          conversation={c}
          active={active.isOpen(c.id)}
          onOpen={active.open}
        />
      ))}
    </Stack>
  );
}
