import { Button, Stack, Tab, Tabs } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import { PACKAGE_FILTERS, type PackageFilter } from '../../hooks/usePackages';

type Props = {
  filter: PackageFilter;
  counts: Record<PackageFilter, number>;
  onFilter: (filter: PackageFilter) => void;
  onCreate: () => void;
};

/**
 * The catalogue's filter and its one primary action.
 *
 * Counts are on the tabs rather than left to be discovered, because the state
 * that matters to a vendor here is "how many of mine are actually visible to
 * clients" — and a Published tab reading zero is the answer to a question they
 * would otherwise have to go looking for.
 *
 * The tabs scroll on narrow screens instead of wrapping, so the New-package
 * button never gets pushed off the row it shares with them.
 */
export default function PackageToolbar({ filter, counts, onFilter, onCreate }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      sx={{ mb: 3 }}
    >
      <Tabs
        value={filter}
        onChange={(_, value) => onFilter(value as PackageFilter)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ flex: 1, minHeight: 40, '& .MuiTab-root': { minHeight: 40 } }}
      >
        {PACKAGE_FILTERS.map((option) => (
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
        onClick={onCreate}
        sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', sm: 'auto' } }}
      >
        New package
      </Button>
    </Stack>
  );
}
