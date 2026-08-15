import { Box, Chip, StatusChip, Tooltip, Typography, type DataTableColumn } from '@sinnapi/ui';
import { formatDateTime } from '@/lib/config';
import { TOPIC_META } from '@/pages/newsletters/schema';
import type { MarketingSubscriptionModel, EmailSuppressionModel } from '@/lib/types';
import { CONSENT_SOURCE_LABELS, SUPPRESSION_REASON_LABELS } from './index';

export const SUBSCRIPTION_COLUMNS: DataTableColumn<MarketingSubscriptionModel>[] = [
  {
    field: 'email',
    headerName: 'Address',
    sortable: true,
    render: (row) => (
      <Typography variant="body2" fontWeight={600} noWrap>
        {row.email}
      </Typography>
    ),
  },
  {
    field: 'topic',
    headerName: 'Topic',
    render: (row) => <Chip size="small" variant="outlined" label={TOPIC_META[row.topic].label} />,
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (row) => <StatusChip status={row.status} />,
  },
  {
    field: 'source',
    headerName: 'Given at',
    render: (row) => (
      <Box>
        <Typography variant="body2" noWrap>
          {CONSENT_SOURCE_LABELS[row.source] ?? row.source}
        </Typography>
        {/* The verbatim wording somebody agreed to is the whole point of the
            record under Art.7(1), so it is reachable from the row rather than
            buried in a detail view nobody opens. */}
        {row.consent_text && (
          <Tooltip title={row.consent_text}>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              display="block"
              sx={{ maxWidth: 260, textDecoration: 'underline dotted' }}
            >
              {row.consent_text}
            </Typography>
          </Tooltip>
        )}
      </Box>
    ),
  },
  {
    field: 'created_at',
    headerName: 'When',
    sortable: true,
    render: (row) => {
      // Whichever event most recently defined this record's standing.
      const [label, value] = row.unsubscribed_at
        ? (['Unsubscribed', row.unsubscribed_at] as const)
        : row.confirmed_at
          ? (['Confirmed', row.confirmed_at] as const)
          : (['Requested', row.consent_at ?? row.created_at] as const);
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

export const SUPPRESSION_COLUMNS: DataTableColumn<EmailSuppressionModel>[] = [
  {
    field: 'email',
    headerName: 'Address',
    sortable: true,
    render: (row) => (
      <Typography variant="body2" fontWeight={600} noWrap>
        {row.email}
      </Typography>
    ),
  },
  {
    field: 'reason',
    headerName: 'Reason',
    render: (row) => <StatusChip status={row.reason} />,
  },
  {
    field: 'detail',
    headerName: 'Detail',
    render: (row) => (
      <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 340 }}>
        {row.detail ?? SUPPRESSION_REASON_LABELS[row.reason] ?? '—'}
      </Typography>
    ),
  },
  {
    field: 'created_at',
    headerName: 'Since',
    sortable: true,
    render: (row) => (
      <Typography variant="body2" noWrap>
        {formatDateTime(row.created_at)}
      </Typography>
    ),
  },
];
