import { Box, Chip, Stack, Switch, Typography, type DataTableColumn } from '@sinnapi/ui';
import StarIcon from '@mui/icons-material/Star';
import { formatMoney, titleize } from '@/lib/config';
import type { PlanModel } from '@/lib/types';
import PlanRowActions from '../components/molecules/PlanRowActions';

type ColumnHandlers = {
  /** Open the plan detail page. */
  onView: (plan: PlanModel) => void;
  /** Open the edit drawer. */
  onEdit: (plan: PlanModel) => void;
  /** Toggle the plan's active flag inline. */
  onToggleActive: (plan: PlanModel, isActive: boolean) => void;
  /** Request a delete (confirmation + write owned by the page). */
  onRequestDelete: (plan: PlanModel) => void;
};

const CYCLE_SUFFIX: Record<string, string> = { monthly: '/mo', annual: '/yr' };

export const getColumns = ({
  onView,
  onEdit,
  onToggleActive,
  onRequestDelete,
}: ColumnHandlers): DataTableColumn<PlanModel>[] => [
  {
    field: 'name',
    headerName: 'Plan',
    sortable: true,
    render: (p) => (
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Typography variant="body2" fontWeight={600} noWrap>
            {p.name}
          </Typography>
          {p.highlight && (
            <Chip
              size="small"
              icon={<StarIcon />}
              label="Popular"
              color="primary"
              variant="outlined"
              sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: 11 } }}
            />
          )}
        </Stack>
        {p.tagline && (
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {p.tagline}
          </Typography>
        )}
      </Box>
    ),
  },
  {
    field: 'key',
    headerName: 'Key',
    sortable: true,
    render: (p) => (
      <Chip label={p.key} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />
    ),
  },
  {
    field: 'billing_cycle',
    headerName: 'Cycle',
    sortable: true,
    render: (p) => titleize(p.billing_cycle),
  },
  {
    field: 'price',
    headerName: 'Price',
    align: 'right',
    sortable: true,
    render: (p) => (
      <Typography variant="body2" fontWeight={600} component="span">
        {formatMoney(p.price, p.currency)}
        <Typography variant="caption" color="text.secondary" component="span">
          {CYCLE_SUFFIX[p.billing_cycle] ?? ''}
        </Typography>
      </Typography>
    ),
  },
  {
    field: 'trial_days',
    headerName: 'Trial',
    align: 'right',
    sortable: true,
    render: (p) => (p.trial_days ? `${p.trial_days} days` : '—'),
  },
  {
    field: 'is_active',
    headerName: 'Active',
    render: (p) => (
      <Switch
        checked={p.is_active}
        onChange={(e, checked) => {
          e.stopPropagation();
          onToggleActive(p, checked);
        }}
        onClick={(e) => e.stopPropagation()}
        inputProps={{ 'aria-label': `Toggle ${p.name} active` }}
      />
    ),
  },
  {
    field: 'actions',
    headerName: 'Actions',
    align: 'right',
    render: (p) => (
      <PlanRowActions plan={p} onView={onView} onEdit={onEdit} onRequestDelete={onRequestDelete} />
    ),
  },
];
