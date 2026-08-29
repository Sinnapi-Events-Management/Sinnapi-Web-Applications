import { Box, Button, SearchField, Stack, Tab, Tabs } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import { DISCOUNT_FILTERS, type DiscountFilter } from '../../schema';

type Props = {
  filter: DiscountFilter;
  counts: Record<DiscountFilter, number>;
  term: string;
  onFilter: (filter: DiscountFilter) => void;
  onTerm: (term: string) => void;
  onClearTerm: () => void;
  onCreate: () => void;
};

/**
 * The code list's two ways in, and its one primary action.
 *
 * The tabs answer "what state", the search answers "which one" — a vendor
 * looking for a code they printed last month knows its name, not its status,
 * and scanning six tabs for it is the work this replaces. Both filter the same
 * rows in the browser, so neither costs a request.
 *
 * Counts sit on the tabs rather than being left to be discovered, because the
 * state that matters here is "how many of mine can a client actually use right
 * now" — and a Live tab reading zero answers a question a vendor would
 * otherwise have to go looking for. They are counted before the search, so
 * typing narrows the grid without rewriting the badges under the cursor.
 *
 * Two rows rather than one: six tabs, a search box and a button do not share a
 * line at any width worth designing for. The tabs scroll instead of wrapping,
 * so the row keeps its height as the counts change; below `sm` the search and
 * the button stack and the button takes the full width, so the primary action
 * is a thumb-width target rather than a chip in the corner.
 */
export default function DiscountsToolbar({
  filter,
  counts,
  term,
  onFilter,
  onTerm,
  onClearTerm,
  onCreate,
}: Props) {
  return (
    <Box sx={{ mb: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        sx={{ mb: 2 }}
      >
        <SearchField
          value={term}
          onChange={onTerm}
          onClear={onClearTerm}
          ariaLabel="Search discount codes"
          placeholder="Search by code or campaign"
          size="small"
          // Grows into the row it shares but never below a width the
          // placeholder fits, so the button beside it cannot squeeze it shut.
          sx={{ flex: 1, minWidth: { sm: 220 } }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreate}
          sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}
        >
          New discount
        </Button>
      </Stack>

      <Tabs
        value={filter}
        onChange={(_, value) => onFilter(value as DiscountFilter)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label="Filter discount codes by status"
        sx={{
          minHeight: 40,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600 },
        }}
      >
        {DISCOUNT_FILTERS.map((option) => (
          <Tab
            key={option.value}
            value={option.value}
            label={`${option.label} (${counts[option.value]})`}
          />
        ))}
      </Tabs>
    </Box>
  );
}
