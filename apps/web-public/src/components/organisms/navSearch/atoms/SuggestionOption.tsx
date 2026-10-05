'use client';
import { Box, Stack, Typography, Avatar } from '@sinnapi/ui/atoms';
import { Storefront, EventNote, NorthWest } from '@mui/icons-material';
import type { SuggestionRow } from '@/lib/types';
import HighlightMatch from './HighlightMatch';

type SuggestionOptionProps = {
  row: SuggestionRow;
  term: string;
  id: string;
  active: boolean;
  /** Attached to the active row only, so the panel can scroll it into view. */
  activeRef?: React.Ref<HTMLElement>;
  onSelect: () => void;
  onHover: () => void;
};

/**
 * One row of the suggestion list.
 *
 * A `<li role="option">`, not a link or a button. The list is the popup half
 * of a combobox, so DOM focus has to stay in the text input while the visitor
 * walks the options — which means these cannot be focusable elements, and the
 * highlight cannot be `:focus`. It is `active`, driven by the parent's index
 * and announced through `aria-activedescendant` on the input.
 *
 * That costs us the one thing a link gives for free: middle-click and
 * cmd-click to open in a new tab. The trade is the pattern's, not ours —
 * roving real focus into the list breaks typing, which is the more common
 * action by a wide margin.
 *
 * `onMouseDown` rather than `onClick`: mousedown fires before the input's
 * blur, so the selection lands before anything has a chance to close the
 * palette out from under the pointer.
 */
export default function SuggestionOption({
  row,
  term,
  id,
  active,
  activeRef,
  onSelect,
  onHover,
}: SuggestionOptionProps) {
  const Icon = row.kind === 'vendor' ? Storefront : EventNote;

  return (
    <Box
      component="li"
      id={id}
      role="option"
      aria-selected={active}
      ref={activeRef}
      onMouseDown={(event: React.MouseEvent) => {
        event.preventDefault();
        onSelect();
      }}
      onMouseMove={onHover}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        // Generous rows: this list is read at a glance and tapped with a
        // thumb, and a 48px target is the floor for the latter.
        py: 1.25,
        cursor: 'pointer',
        borderRadius: 2,
        bgcolor: active ? 'action.selected' : 'transparent',
        transition: 'background-color .12s ease',
      }}
    >
      {row.image_url ? (
        <Avatar src={row.image_url} alt="" variant="rounded" sx={{ width: 40, height: 40 }} />
      ) : (
        <Avatar
          variant="rounded"
          sx={{ width: 40, height: 40, bgcolor: 'action.hover', color: 'text.secondary' }}
        >
          <Icon fontSize="small" />
        </Avatar>
      )}

      <Stack sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body1"
          sx={{
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <HighlightMatch text={row.label} term={term} />
        </Typography>
        {row.sublabel && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {row.sublabel}
          </Typography>
        )}
      </Stack>

      {/* The "this is what Enter does" affordance, on the highlighted row only
          — a permanent one on every row is the visual noise Baymard warns
          costs more scannability than it buys discoverability. */}
      <NorthWest
        fontSize="small"
        sx={{ color: 'text.disabled', opacity: active ? 1 : 0, transition: 'opacity .12s ease' }}
      />
    </Box>
  );
}
