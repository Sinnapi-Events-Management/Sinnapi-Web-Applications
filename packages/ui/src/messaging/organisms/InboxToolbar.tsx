'use client';
import { Stack, Box, Typography, Chip } from '@mui/material';
import { SearchField } from '../../molecules/SearchField';
import { conversationTypeFilters, type MessagingAudience } from '../conversationType';

export type InboxTypeFilterState = {
  selected: string[];
  toggle: (value: string) => void;
  clear: () => void;
  isSelected: (value: string) => boolean;
};

export type InboxSearchState = {
  input: string;
  setInput: (value: string) => void;
  clear: () => void;
};

export type InboxToolbarProps = {
  search: InboxSearchState;
  audience: MessagingAudience;
  /** Omitted in inboxes that only ever hold one conversation type. */
  typeFilter?: InboxTypeFilterState;
  resultCount: number;
  /** Portal-specific control — a "New message" button, for instance. */
  action?: React.ReactNode;
};

/**
 * Search, type chips and the result count for the master column.
 *
 * The search input owns its own row and fills the column: the master pane is
 * only ~440px at its widest, and pairing the input with a nowrap count on one
 * line left neither enough room. The count rides with the chips instead, where
 * it can wrap.
 *
 * Selecting no type means "all types", so there is no explicit all-chip — the
 * clear affordance only appears once a filter is actually on.
 */
export function InboxToolbar({
  search,
  audience,
  typeFilter,
  resultCount,
  action,
}: InboxToolbarProps) {
  const options = typeFilter ? conversationTypeFilters(audience) : [];

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <SearchField
            value={search.input}
            onChange={search.setInput}
            onClear={search.clear}
            placeholder="Search name, subject or message…"
            ariaLabel="Search conversations"
          />
        </Box>
        {action}
      </Stack>

      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ flexWrap: 'wrap', rowGap: 0.75 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {typeFilter && (
            <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center">
              {options.map((t) => {
                const selected = typeFilter.isSelected(t.value);
                return (
                  <Chip
                    key={t.value}
                    size="small"
                    label={t.label}
                    clickable
                    onClick={() => typeFilter.toggle(t.value)}
                    color={selected ? 'primary' : 'default'}
                    variant={selected ? 'filled' : 'outlined'}
                    aria-pressed={selected}
                    sx={{ fontWeight: selected ? 600 : 400 }}
                  />
                );
              })}
              {typeFilter.selected.length > 0 && (
                <Chip
                  size="small"
                  label="Clear types"
                  variant="outlined"
                  onDelete={typeFilter.clear}
                  onClick={typeFilter.clear}
                  sx={{ color: 'text.secondary' }}
                />
              )}
            </Stack>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {resultCount} {resultCount === 1 ? 'conversation' : 'conversations'}
        </Typography>
      </Stack>
    </Stack>
  );
}
