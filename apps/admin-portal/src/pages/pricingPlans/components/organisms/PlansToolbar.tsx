import { Button, MenuItem, Stack, TextField } from '@sinnapi/ui';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { BILLING_CYCLE_OPTIONS } from '../../schema';
import type { PlanFiltersState } from '../../hooks/usePricingPlans';

type Props = {
  filters: PlanFiltersState;
};

const STATUS_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

/**
 * Catalogue filters. Presentational: it renders the controls and delegates
 * every change to the `filters` state the page hook owns. The create entry
 * point lives in the page header (see PricingPlans).
 */
export default function PlansToolbar({ filters }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      alignItems={{ md: 'center' }}
      sx={{ mb: 2 }}
    >
      <TextField
        select
        size="small"
        label="Cycle"
        value={filters.cycle}
        onChange={(e) => filters.setCycle(e.target.value)}
        sx={{ minWidth: 150 }}
      >
        <MenuItem value="">Any</MenuItem>
        {BILLING_CYCLE_OPTIONS.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Status"
        value={filters.active}
        onChange={(e) => filters.setActive(e.target.value)}
        sx={{ minWidth: 150 }}
      >
        <MenuItem value="">Any</MenuItem>
        {STATUS_OPTIONS.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>

      {filters.isActive && (
        <Button
          size="small"
          color="inherit"
          startIcon={<FilterAltOffIcon />}
          onClick={filters.reset}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Clear
        </Button>
      )}
    </Stack>
  );
}
