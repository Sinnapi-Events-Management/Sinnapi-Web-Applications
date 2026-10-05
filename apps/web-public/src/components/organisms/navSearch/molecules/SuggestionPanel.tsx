'use client';
import { Box, Stack, Typography, Divider, Skeleton } from '@sinnapi/ui/atoms';
import { Search, SearchOff } from '@mui/icons-material';
import type { SuggestionRow } from '@/lib/types';
import { groupSuggestions, optionId } from '../utils/suggestions';
import SuggestionOption from '../atoms/SuggestionOption';

type SuggestionPanelProps = {
  listboxId: string;
  rows: SuggestionRow[];
  /** The term the rows answer — what each label highlights against. */
  term: string;
  /** What is in the box right now, which the "search for" row acts on. */
  typed: string;
  activeIndex: number;
  activeRef: React.Ref<HTMLElement>;
  isLoading: boolean;
  isRefreshing: boolean;
  isEmpty: boolean;
  isTooShort: boolean;
  onSelect: (index: number) => void;
  onHover: (index: number) => void;
  onSubmit: () => void;
};

/** Placeholder rows while the first request for a term is in flight. */
function LoadingRows() {
  return (
    <Stack sx={{ px: 2, py: 1, gap: 1.5 }} aria-hidden>
      {[0, 1, 2].map((i) => (
        <Stack key={i} direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
          <Skeleton variant="rounded" width={40} height={40} />
          <Stack sx={{ flex: 1, gap: 0.5 }}>
            <Skeleton variant="text" width={`${70 - i * 12}%`} height={18} />
            <Skeleton variant="text" width="30%" height={14} />
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}

/**
 * The popup half of the combobox: two labelled sections of options, plus the
 * row that runs the full search on whatever was typed.
 *
 * WHY "SEARCH FOR …" IS A FOOTER AND NOT AN OPTION
 * It is the default action, not a candidate among candidates: pressing Enter
 * with nothing highlighted already does exactly this, which is why it sits
 * outside the listbox with the Enter hint on it rather than occupying an
 * arrow-key position. Putting it in the list would also mean the flat index
 * the cursor walks no longer maps one-to-one onto `rows`, and that mismatch
 * is how a keyboard selection ends up opening the wrong vendor.
 *
 * It is always offered once something has been typed — including, especially,
 * when there are no suggestions at all. The grid's relaxed any-word fallback
 * (migration 20261005000001) can find things this ten-row preview does not,
 * so an empty dropdown must never read as "nothing exists".
 *
 * `aria-busy` rather than a spinner while refreshing: the previous term's
 * rows stay on screen and get dimmed, so there is nothing to spin over.
 */
export default function SuggestionPanel({
  listboxId,
  rows,
  term,
  typed,
  activeIndex,
  activeRef,
  isLoading,
  isRefreshing,
  isEmpty,
  isTooShort,
  onSelect,
  onHover,
  onSubmit,
}: SuggestionPanelProps) {
  const groups = groupSuggestions(rows);
  const hasTyped = typed.trim().length > 0;

  return (
    <Box>
      <Box
        sx={{
          maxHeight: { xs: '50dvh', sm: 420 },
          overflowY: 'auto',
          opacity: isRefreshing ? 0.55 : 1,
          transition: 'opacity .15s ease',
        }}
      >
        {/* The listbox exists whenever the combobox is expanded, even while
            empty — `aria-controls` on the input has to point at something. */}
        <Box
          component="ul"
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          aria-busy={isLoading || isRefreshing}
          sx={{ listStyle: 'none', m: 0, p: rows.length ? 1 : 0 }}
        >
          {/* role="group" sits on the <li> itself rather than on a wrapper
              inside it: a listbox may own options and groups, and nothing
              else. An unroled <li> in between would be exposed as a plain
              listitem and break that ownership, which is how a screen reader
              ends up announcing "list, 2 items" over a list of six vendors.
              The inner <ul> is presentational for the same reason — it exists
              for the markup, not for the accessibility tree. */}
          {groups.map((group) => (
            <Box
              component="li"
              key={group.kind}
              role="group"
              aria-labelledby={`${listboxId}-group-${group.kind}`}
              sx={{ listStyle: 'none' }}
            >
              <Typography
                id={`${listboxId}-group-${group.kind}`}
                variant="overline"
                color="text.secondary"
                sx={{ display: 'block', px: 2, pt: 1, pb: 0.5, letterSpacing: '.08em' }}
              >
                {group.heading}
              </Typography>
              <Box component="ul" role="presentation" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                {group.rows.map((row, i) => {
                  const index = group.offset + i;
                  const active = index === activeIndex;
                  return (
                    <SuggestionOption
                      key={`${row.kind}-${row.id}`}
                      row={row}
                      term={term}
                      id={optionId(listboxId, index)}
                      active={active}
                      activeRef={active ? activeRef : undefined}
                      onSelect={() => onSelect(index)}
                      onHover={() => onHover(index)}
                    />
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>

        {isLoading && <LoadingRows />}

        {isEmpty && !isLoading && (
          <Stack sx={{ alignItems: 'center', gap: 1, px: 3, py: 4, textAlign: 'center' }}>
            <SearchOff sx={{ color: 'text.disabled' }} />
            <Typography variant="body2" color="text.secondary">
              No vendors or events match “{term}” yet.
            </Typography>
            <Typography variant="caption" color="text.disabled">
              The full search looks wider than this preview — try it below.
            </Typography>
          </Stack>
        )}

        {isTooShort && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 3, py: 3 }}>
            Keep typing to see suggestions.
          </Typography>
        )}

        {!hasTyped && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 3, py: 3 }}>
            Search vendors by name, town or service — or find an event to quote on.
          </Typography>
        )}
      </Box>

      {hasTyped && (
        <>
          <Divider />
          <Box
            onMouseDown={(event: React.MouseEvent) => {
              event.preventDefault();
              onSubmit();
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 3,
              py: 1.75,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Search fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
              Search all vendors for{' '}
              <Box component="span" sx={{ fontWeight: 600 }}>
                “{typed.trim()}”
              </Box>
            </Typography>
            <Box
              component="kbd"
              sx={{
                display: { xs: 'none', sm: 'inline-block' },
                px: 0.75,
                py: 0.25,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                fontSize: '0.7rem',
                color: 'text.secondary',
              }}
            >
              Enter
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
