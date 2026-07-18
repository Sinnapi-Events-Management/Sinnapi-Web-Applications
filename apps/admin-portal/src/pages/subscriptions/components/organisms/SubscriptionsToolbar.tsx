import { Box, Stack, TextField, MenuItem, Switch, FormControlLabel, Button } from '@sinnapi/ui';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import SearchField from '@/components/ui/SearchField';
import type { SearchTerm } from '@/hooks/useSearchTerm';
import { EXPIRING_SOON_DAYS, type PricingPlanOption } from '@/hooks/queries';
import type { SubscriptionFilters } from '../../hooks/useSubscriptionFilters';

type SubscriptionsToolbarProps = {
  search: SearchTerm;
  filters: SubscriptionFilters;
  planOptions: PricingPlanOption[];
};

/**
 * Search + attribute filters for the Subscriptions list. Presentational: it
 * renders the controls and delegates every change to the `search`/`filters`
 * hooks the page hook already owns. Collapses to a single column on narrow
 * screens.
 */
export default function SubscriptionsToolbar({
  search,
  filters,
  planOptions,
}: SubscriptionsToolbarProps) {
  const { values, setPlanId, setExpiringSoon, isActive, reset } = filters;

  const showClear = isActive || Boolean(search.input);
  const clearAll = () => {
    reset();
    search.clear();
  };

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      alignItems={{ md: 'center' }}
      sx={{ mb: 2 }}
    >
      <Box sx={{ flex: 1, minWidth: { md: 240 } }}>
        <SearchField
          value={search.input}
          onChange={search.setInput}
          onClear={search.clear}
          placeholder="Search by vendor…"
          ariaLabel="Search subscriptions by vendor"
        />
      </Box>

      <TextField
        select
        size="small"
        label="Plan"
        value={values.planId}
        onChange={(e) => setPlanId(e.target.value)}
        sx={{ minWidth: 180 }}
      >
        <MenuItem value="">Any</MenuItem>
        {planOptions.map((plan) => (
          <MenuItem key={plan.id} value={plan.id}>
            {plan.name}
          </MenuItem>
        ))}
      </TextField>

      <FormControlLabel
        control={
          <Switch
            checked={values.expiringSoon}
            onChange={(e) => setExpiringSoon(e.target.checked)}
          />
        }
        label={`Expiring in ${EXPIRING_SOON_DAYS} days`}
        sx={{ whiteSpace: 'nowrap', mr: 0 }}
      />

      {showClear && (
        <Button
          size="small"
          color="inherit"
          startIcon={<FilterAltOffIcon />}
          onClick={clearAll}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Clear
        </Button>
      )}
    </Stack>
  );
}
