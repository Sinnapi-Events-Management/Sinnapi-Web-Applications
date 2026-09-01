import { Button, Stack, Tab, Tabs } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import { SERVICE_FILTERS, type ServiceFilter } from '../../schema';

type Props = {
  filter: ServiceFilter;
  counts: Record<ServiceFilter, number>;
  onFilter: (filter: ServiceFilter) => void;
  onAdd: () => void;
};

/**
 * The catalogue's filter and its one primary action.
 *
 * Counts sit on the tabs rather than being left to be discovered, because the
 * number that matters to a vendor here is "how many of mine can a client
 * actually see" — and a Live tab reading zero is the answer to a question they
 * would otherwise have to go looking for. It is also the only place the
 * Archived drawer announces that it has anything in it.
 *
 * The tabs scroll on narrow screens instead of wrapping, so the Add button
 * never gets pushed off the row it shares with them; below `sm` the whole bar
 * stacks and the button goes full width, where a 44px target beats a chip in
 * the corner. Same arrangement as `PackageToolbar`, so a vendor moving between
 * the two screens is looking at one interface rather than two similar ones.
 */
export default function ServicesToolbar({ filter, counts, onFilter, onAdd }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      sx={{ mb: 3 }}
    >
      <Tabs
        value={filter}
        onChange={(_, value) => onFilter(value as ServiceFilter)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ flex: 1, minHeight: 40, '& .MuiTab-root': { minHeight: 40 } }}
      >
        {SERVICE_FILTERS.map((option) => (
          <Tab
            key={option.value}
            value={option.value}
            label={`${option.label} (${counts[option.value]})`}
          />
        ))}
      </Tabs>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onAdd}
        sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}
      >
        Add service
      </Button>
    </Stack>
  );
}
