import { Tabs, Tab, Badge } from '@sinnapi/ui';
import type { InboxCounts, InboxTab } from '@sinnapi/ui/messaging';

type Props = {
  counts: InboxCounts;
  value: InboxTab;
  onChange: (next: InboxTab) => void;
};

/**
 * Status tabs above the client's conversation list.
 *
 * `blocked` is deliberately absent. It is a moderation outcome, and a tab
 * inviting a client to browse their blocked conversations makes the platform's
 * enforcement look like a folder they own. The threads are still reachable
 * under "All", where the row carries a status chip explaining itself.
 */
const TABS: { value: InboxTab; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
];

export default function InboxTabs({ counts, value, onChange }: Props) {
  return (
    <Tabs
      value={value}
      onChange={(_, next: InboxTab) => onChange(next)}
      variant="scrollable"
      scrollButtons="auto"
      aria-label="Filter conversations by status"
      sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, textTransform: 'none' } }}
    >
      {TABS.map((t) => (
        <Tab
          key={t.value}
          value={t.value}
          label={
            // The unread count rides the Active tab because that is where an
            // unanswered message actually is; a badge on every tab would just
            // repeat the same number three times.
            t.value === 'active' && counts.unread > 0 ? (
              <Badge badgeContent={counts.unread} color="primary" sx={{ pr: 1.5 }}>
                {t.label}
              </Badge>
            ) : (
              `${t.label}${counts[t.value] ? ` (${counts[t.value]})` : ''}`
            )
          }
        />
      ))}
    </Tabs>
  );
}
