'use client';
import type { ReactNode } from 'react';
import { InboxLayout } from '../../messaging/organisms/InboxLayout';

export type NotificationsWorkspaceProps = {
  /** The master column: toolbar and feed. */
  master: ReactNode;
  /** The detail column: the pane for the open notification. */
  detail: ReactNode;
  /** Whether a notification is open — drives the mobile drawer. */
  detailOpen: boolean;
  onCloseDetail: () => void;
  /** Vertical space already consumed by page chrome above the workspace. */
  offsetPx?: number;
};

/**
 * Responsive master–detail shell for the notification feed.
 *
 * Delegates to the messaging kit's `InboxLayout` rather than restating its
 * geometry: an inbox of conversations and an inbox of notifications are the
 * same layout problem — two columns on desktop, a full-width list and a drawer
 * on mobile — and two copies of that would drift apart at the first breakpoint
 * tweak. The alias exists so the notifications page names what it is composing.
 *
 * The offset is larger than messaging's default because this page carries more
 * chrome above the workspace: a page title, a summary row and the read-state
 * tabs, where an inbox has only its title.
 */
export function NotificationsWorkspace({
  master,
  detail,
  detailOpen,
  onCloseDetail,
  offsetPx = 260,
}: NotificationsWorkspaceProps) {
  return (
    <InboxLayout
      master={master}
      detail={detail}
      detailOpen={detailOpen}
      onCloseDetail={onCloseDetail}
      offsetPx={offsetPx}
    />
  );
}
