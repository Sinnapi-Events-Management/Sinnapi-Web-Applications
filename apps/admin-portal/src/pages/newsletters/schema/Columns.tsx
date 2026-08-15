import { Box, Stack, Typography, StatusChip, type DataTableColumn } from '@sinnapi/ui';
import { formatDateTime } from '@/lib/config';
import type { NewsletterCampaignModel } from '@/lib/types';
import AudienceChip from '../components/molecules/AudienceChip';
import CampaignProgress from '../components/molecules/CampaignProgress';

/**
 * When a campaign went — or will go — out.
 *
 * One column rather than three, because only one of `completed_at`,
 * `scheduled_at` and `created_at` is the interesting date for any given row,
 * and which one it is follows from the status. Three sparse columns would make
 * the table wider to say less.
 */
function timing(c: NewsletterCampaignModel): { label: string; value: string | null } {
  if (c.completed_at) return { label: 'Sent', value: c.completed_at };
  if (c.status === 'sending') return { label: 'Started', value: c.started_at };
  if (c.scheduled_at) return { label: 'Scheduled', value: c.scheduled_at };
  return { label: 'Created', value: c.created_at };
}

export const CAMPAIGN_COLUMNS: DataTableColumn<NewsletterCampaignModel>[] = [
  {
    field: 'title',
    headerName: 'Campaign',
    sortable: true,
    render: (c) => (
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {c.title}
        </Typography>
        {/* The subject is what recipients actually saw, so it belongs on the
            row even though the internal title is the primary label. */}
        <Typography variant="caption" color="text.secondary" noWrap display="block">
          {c.subject}
        </Typography>
      </Box>
    ),
  },
  {
    field: 'audience',
    headerName: 'Audience',
    render: (c) => <AudienceChip audience={c.audience} />,
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (c) => (
      <Stack spacing={0.5}>
        <StatusChip status={c.status} />
        {c.error && (
          <Typography variant="caption" color="error.main" noWrap>
            {c.error}
          </Typography>
        )}
      </Stack>
    ),
  },
  {
    field: 'recipient_count',
    headerName: 'Delivery',
    render: (c) => <CampaignProgress campaign={c} />,
  },
  {
    field: 'created_at',
    headerName: 'When',
    sortable: true,
    render: (c) => {
      const { label, value } = timing(c);
      return (
        <Box>
          <Typography variant="body2" noWrap>
            {formatDateTime(value)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Box>
      );
    },
  },
];
