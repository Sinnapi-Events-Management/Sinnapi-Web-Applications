import { Grid } from '@sinnapi/ui';
import ForumIcon from '@mui/icons-material/Forum';
import MarkChatUnreadIcon from '@mui/icons-material/MarkChatUnread';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SummaryTile from '@/components/ui/SummaryTile';
import type { InboxCounts } from '../../schema';

type Props = {
  counts: InboxCounts;
  loading?: boolean;
};

/** KPI bar above the inbox: total, unread, active and archived conversations. */
export default function InboxSummary({ counts, loading }: Props) {
  const tiles = [
    { label: 'Conversations', value: counts.all, icon: <ForumIcon />, accent: 'default' as const },
    {
      label: 'Unread',
      value: counts.unread,
      icon: <MarkChatUnreadIcon sx={{ color: 'white' }} />,
      accent: 'warning' as const,
    },
    {
      label: 'Active',
      value: counts.active,
      icon: <ChatBubbleOutlineIcon sx={{ color: 'white' }} />,
      accent: 'success' as const,
    },
    {
      label: 'Archived',
      value: counts.archived,
      icon: <Inventory2Icon />,
      accent: 'default' as const,
    },
  ];

  return (
    // 2-up until `lg`: at ~990px four tiles left each one too narrow for
    // "Conversations" and "Archived", which clipped rather than wrapped.
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {tiles.map((t) => (
        <Grid key={t.label} item xs={6} lg={3}>
          <SummaryTile {...t} loading={loading} />
        </Grid>
      ))}
    </Grid>
  );
}
