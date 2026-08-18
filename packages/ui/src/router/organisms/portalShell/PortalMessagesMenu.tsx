'use client';
import { useMemo } from 'react';
import { Stack } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ForumIcon from '@mui/icons-material/Forum';
import { PortalAlertsToggle } from './PortalAlertsToggle';
import { PortalBadgeButton } from './PortalBadgeButton';
import { PortalMenuFooterLink } from './PortalMenuFooterLink';
import { PortalMenuEmpty, PortalMenuError, PortalMenuSkeleton } from './PortalMenuStates';
import { PortalMenuPanel } from './PortalMenuPanel';
import { PortalMessagePreviewRow } from './PortalMessagePreviewRow';
import { previewConversations, unreadSummary } from './menuPreview';
import { useBadgeMenu } from './hooks/useBadgeMenu';
import { useUnreadPulse } from './hooks/useUnreadPulse';
import type { PortalMessagesFeed } from './types';

export type PortalMessagesMenuProps = {
  feed: PortalMessagesFeed;
};

/**
 * The top bar's message centre: an unread count that stays live wherever the
 * user is in the product, and a preview of who is waiting on them.
 *
 * The panel is a *preview*, never a second inbox. It lists the six most recent
 * threads and hands off to `/messages` for anything else — filters, search,
 * archived threads and the composer all belong to a page with room for them.
 * That boundary is what keeps this from becoming a chat client living inside a
 * dropdown.
 *
 * Rows are fetched on first open, not on mount. The badge is served by a
 * cheap head-count RPC that every page already pays for; the conversation list
 * is a heavier read that most sessions never look at, and loading it on every
 * page view would be a request nobody asked for.
 */
export function PortalMessagesMenu({ feed }: PortalMessagesMenuProps) {
  const menu = useBadgeMenu({ onOpen: feed.onOpen });
  const pulse = useUnreadPulse(feed.unread);

  const rows = useMemo(() => previewConversations(feed.conversations), [feed.conversations]);

  const open = (conversationId: string) => {
    menu.onClose();
    feed.onSelect(conversationId);
  };

  return (
    <>
      <PortalBadgeButton
        icon={<ChatBubbleOutlineIcon />}
        label="Messages"
        count={feed.unread}
        color="primary"
        open={menu.open}
        pulse={pulse}
        onClick={menu.onOpen}
      />

      <PortalMenuPanel
        anchorEl={menu.anchor}
        open={menu.open}
        onClose={menu.onClose}
        title="Messages"
        subtitle={unreadSummary(feed.unread, 'message', 'messages')}
        headerAction={
          feed.alerts && <PortalAlertsToggle alerts={feed.alerts} subject="new messages" />
        }
        footer={
          <PortalMenuFooterLink to={feed.to} label="View all messages" onNavigate={menu.onClose} />
        }
      >
        <PortalMessagesMenuBody feed={feed} rows={rows} onOpen={open} />
      </PortalMenuPanel>
    </>
  );
}

/**
 * Split out so the panel above reads as a shape and this reads as a decision:
 * error before loading before empty, and never two of them at once.
 */
function PortalMessagesMenuBody({
  feed,
  rows,
  onOpen,
}: {
  feed: PortalMessagesFeed;
  rows: ReturnType<typeof previewConversations>;
  onOpen: (conversationId: string) => void;
}) {
  if (feed.error) return <PortalMenuError message="Your conversations could not be loaded." />;
  if (feed.isLoading && rows.length === 0) return <PortalMenuSkeleton />;
  if (rows.length === 0) {
    return (
      <PortalMenuEmpty
        icon={<ForumIcon />}
        title="No conversations yet"
        description="Messages from your bookings and quotes will appear here."
      />
    );
  }

  return (
    <Stack spacing={0.25}>
      {rows.map((conversation) => (
        <PortalMessagePreviewRow
          key={conversation.id}
          conversation={conversation}
          audience={feed.audience}
          onOpen={onOpen}
        />
      ))}
    </Stack>
  );
}
