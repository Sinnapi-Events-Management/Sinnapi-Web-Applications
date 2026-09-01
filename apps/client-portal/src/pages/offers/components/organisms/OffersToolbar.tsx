import { Box, Button, FacetSelect, SearchField, Stack } from '@sinnapi/ui';
import ClearIcon from '@mui/icons-material/Clear';

type Props = {
  search: string;
  onSearch: (value: string) => void;
  categoryId: string | null;
  onCategory: (value: string | null) => void;
  categoryOptions: { value: string; label: string }[];
  isFiltered: boolean;
  onClear: () => void;
  total: number;
};

/**
 * Search and one filter, over the offers directory.
 *
 * ONE FILTER, NOT FOUR
 * Discover's toolbar carries category, region, price band and rating, because a
 * vendor list is long-lived and browsed at leisure. This list is short — only
 * offers that are live today, with a published package behind them — and it is
 * read against a deadline. A four-facet toolbar over sixty results is four
 * controls that mostly return "no matches", which teaches a client that the
 * page is empty when it is their filter that is.
 *
 * The count sits in the toolbar rather than above the grid so that it is beside
 * the controls that change it: a client who narrows to a category and sees the
 * number move has been told their filter did something, without a re-render
 * they have to go looking for.
 *
 * Stacks on a phone. Two controls side by side at 360px are two controls that
 * each get half a word of their label.
 *
 * EVERY ITEM ON THIS ROW STATES ITS OWN WIDTH
 * The portal theme defaults `MuiTextField` to `fullWidth`, so a bare field on a
 * flex row resolves its flex-basis to 100% of the row and claims the whole line
 * before anything else is measured. Pairing that with `flex: 1` (basis `0`) on
 * the search box is the exact trap Discover's toolbar documents hitting: there
 * is no positive free space left for the flexible sibling to grow into, so the
 * search box settles at zero width with its adornment overflowing across the
 * dropdown beside it. Hence the fixed track for the facet and `flexShrink: 0`
 * on the trailing count and button — the only item allowed to be elastic is the
 * one that should absorb the leftover width.
 *
 * The controls are the shared `SearchField` and `FacetSelect` rather than raw
 * fields, so the clear affordance, the labelling and the adornment spacing stay
 * identical to Discover's without either page maintaining its own copy.
 */
export default function OffersToolbar({
  search,
  onSearch,
  categoryId,
  onCategory,
  categoryOptions,
  isFiltered,
  onClear,
  total,
}: Props) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'stretch', md: 'center' }}
      sx={{ mb: 3 }}
    >
      {/* The one elastic item: takes whatever the fixed tracks leave behind.
          minWidth 0 lets it shrink politely rather than push them off the line. */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <SearchField
          value={search}
          onChange={onSearch}
          onClear={() => onSearch('')}
          placeholder="Search offers, vendors or packages"
          ariaLabel="Search offers"
          inputProps={{ enterKeyHint: 'search' }}
        />
      </Box>

      <Box sx={{ flexShrink: 0, width: { xs: '100%', md: 220 } }}>
        <FacetSelect
          label="Category"
          value={categoryId ?? ''}
          onChange={(next) => onCategory(next || null)}
          options={categoryOptions}
          anyLabel="All categories"
          // Locked until the vocabulary arrives: a dropdown that opens onto
          // nothing reads as "there are no categories", which is a different
          // and wrong statement.
          disabled={categoryOptions.length === 0}
        />
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          color: 'text.secondary',
          fontSize: 14,
          whiteSpace: 'nowrap',
          // Right-aligned on desktop where it trails the controls; left on a
          // phone where it becomes a line of its own under them.
          textAlign: { xs: 'left', md: 'right' },
        }}
      >
        {total} {total === 1 ? 'offer' : 'offers'}
      </Box>

      {isFiltered && (
        <Button
          size="small"
          color="inherit"
          startIcon={<ClearIcon />}
          onClick={onClear}
          sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          Clear
        </Button>
      )}
    </Stack>
  );
}
