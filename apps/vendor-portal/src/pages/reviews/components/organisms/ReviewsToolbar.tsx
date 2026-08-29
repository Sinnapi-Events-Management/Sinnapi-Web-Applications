import {
  Box,
  Chip,
  FacetSelect,
  SearchField,
  Stack,
  StatusTabs,
  type StatusTabOption,
} from '@sinnapi/ui';
import {
  REPLY_FILTERS,
  REVIEW_SORTS,
  type ReplyFilter,
  type ReviewSort,
  type StarFilter,
} from '../../schema';

type Props = {
  reply: ReplyFilter;
  counts: Record<ReplyFilter, number>;
  onReply: (reply: ReplyFilter) => void;
  term: string;
  onTerm: (term: string) => void;
  onClearTerm: () => void;
  sort: ReviewSort;
  onSort: (sort: ReviewSort) => void;
  star: StarFilter;
  onClearStar: () => void;
};

/**
 * The three ways into the list, and the one active filter that is set from
 * somewhere else.
 *
 * Two rows rather than one: three tabs, a search box and a sort control do not
 * share a line at any width worth designing for. Below `sm` the search and the
 * sort stack, so neither is squeezed to a width its own label no longer fits.
 *
 * The reply tabs carry counts because "how many do I still owe" is the question
 * this page exists to answer, and a vendor should get it from the tab bar
 * rather than by selecting a filter to find out. They are counted on every
 * review rather than on the searched set, so typing narrows the list without
 * rewriting the badges under the cursor — and so the "Awaiting reply" tab
 * always agrees with the KPI tile above it.
 *
 * The score filter is set on the distribution card, not here, but it is cleared
 * here: a filter a vendor can turn on in one place and only turn off by
 * remembering where they set it is a trap, so it surfaces as a removable chip
 * beside the controls it is acting with.
 */
export default function ReviewsToolbar({
  reply,
  counts,
  onReply,
  term,
  onTerm,
  onClearTerm,
  sort,
  onSort,
  star,
  onClearStar,
}: Props) {
  const tabs: StatusTabOption<ReplyFilter>[] = REPLY_FILTERS.map((option) => ({
    ...option,
    count: counts[option.value],
  }));

  return (
    <Box sx={{ mb: 2 }}>
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
          ariaLabel="Search reviews"
          placeholder="Search by client, headline or wording"
          size="small"
          // Grows into the row it shares but never below a width the
          // placeholder fits, so the sort control beside it cannot squeeze it shut.
          sx={{ flex: 1, minWidth: { sm: 240 } }}
        />
        <Box sx={{ width: { xs: '100%', sm: 200 }, flexShrink: 0 }}>
          <FacetSelect
            label="Sort"
            value={sort}
            onChange={(next) => onSort(next as ReviewSort)}
            options={REVIEW_SORTS}
            hideAnyOption
          />
        </Box>
      </Stack>

      <StatusTabs
        options={tabs}
        value={reply}
        onChange={onReply}
        ariaLabel="Filter reviews by whether you have replied"
      />

      {star !== 0 && (
        <Chip
          label={`${star}-star reviews only`}
          onDelete={onClearStar}
          size="small"
          color="secondary"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      )}
    </Box>
  );
}
