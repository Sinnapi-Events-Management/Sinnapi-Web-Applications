'use client';
import type { ReactNode } from 'react';
import {
  Badge,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TuneIcon from '@mui/icons-material/Tune';
import CloseIcon from '@mui/icons-material/Close';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

/**
 * Where the panel stops being a bottom sheet and becomes an inline drawer.
 *
 * Exported because the caller owns the open/closed state and often wants to
 * default it open on the roomy side of this line — the two must agree on where
 * the line is, or a filtered link opens a sheet over the results on a phone.
 */
export const FILTER_DISCLOSURE_BREAKPOINT = 'md' as const;

export type FilterToggleButtonProps = {
  open: boolean;
  onToggle: () => void;
  /** How many filters are currently narrowing the results. 0 renders no badge. */
  activeCount?: number;
  /** `id` of the panel this controls, for `aria-controls`. */
  controls: string;
  label?: string;
};

/**
 * The control that reveals the filter panel, carrying the count of what is
 * already applied.
 *
 * The badge is the whole point: filters that are folded away are filters
 * someone can forget they set, and "why is this list so thin" is the most
 * expensive question a search UI can leave unanswered. The count travels with
 * the button that hides them.
 */
export function FilterToggleButton({
  open,
  onToggle,
  activeCount = 0,
  controls,
  label = 'Filters',
}: FilterToggleButtonProps) {
  return (
    <Button
      onClick={onToggle}
      color="inherit"
      variant="outlined"
      aria-expanded={open}
      aria-controls={controls}
      startIcon={
        <Badge badgeContent={activeCount} color="secondary" overlap="circular">
          <TuneIcon />
        </Badge>
      }
      endIcon={
        <ExpandLessIcon
          sx={{
            transition: 'transform .2s ease',
            transform: open ? 'rotate(0deg)' : 'rotate(180deg)',
          }}
        />
      }
      sx={{ whiteSpace: 'nowrap', flexShrink: 0, borderColor: 'divider' }}
    >
      {label}
    </Button>
  );
}

export type FilterDisclosureProps = {
  /** Must match the `controls` given to the toggle button. */
  id: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  activeCount?: number;
  /** Clears every filter. Omit and no clear affordance renders. */
  onClear?: () => void;
  /** Result count for the sheet's confirm button, e.g. "Show 24 results". */
  resultCount?: number;
};

/**
 * A filter panel that changes form with the room it has: an inline expander on
 * a wide viewport, a bottom sheet on a narrow one.
 *
 * Both portals previously kept every facet permanently open above the results.
 * On a phone that puts a full screen of dropdowns between someone and the thing
 * they came to look at — the controls outrank the content on the one device
 * where the fold is tightest. Folding them away only works if nothing is hidden
 * silently, which is why the toggle badges the active count and callers pair
 * this with a row of removable chips.
 *
 * A bottom sheet rather than a side drawer on mobile: the facets are a thumb
 * task, and the bottom of the screen is where the thumb already is. The sheet
 * caps at 85vh so the results stay visible behind it — the panel reads as a
 * layer over the list, not a separate page.
 */
export function FilterDisclosure({
  id,
  open,
  onClose,
  children,
  title = 'Filters',
  activeCount = 0,
  onClear,
  resultCount,
}: FilterDisclosureProps) {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down(FILTER_DISCLOSURE_BREAKPOINT));

  const header = (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.5 }}>
      <Typography variant="h6" sx={{ flex: 1 }}>
        {title}
        {activeCount > 0 && (
          <Chip size="small" label={activeCount} sx={{ ml: 1, fontWeight: 600 }} />
        )}
      </Typography>
      {onClear && activeCount > 0 && (
        <Button size="small" color="inherit" onClick={onClear}>
          Clear all
        </Button>
      )}
      <IconButton size="small" onClick={onClose} aria-label={`Close ${title.toLowerCase()}`}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Stack>
  );

  if (isCompact) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        PaperProps={{
          id,
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '85vh',
            // The sheet is a layer above the page canvas, so it takes the
            // raised `paper` surface rather than the canvas colour — in dark
            // mode a canvas-coloured sheet has nothing separating it from the
            // list behind it.
            bgcolor: 'background.paper',
            backgroundImage: 'none',
          },
        }}
      >
        {/* Grab handle. Purely a signal that the sheet is dismissable by drag
            on the platforms that support it; hidden from assistive tech, which
            has the labelled close button instead. */}
        <Box
          aria-hidden
          sx={{
            width: 36,
            height: 4,
            borderRadius: 2,
            bgcolor: 'divider',
            mx: 'auto',
            mt: 1.25,
          }}
        />
        {header}
        <Divider />
        <Box sx={{ p: 2, overflowY: 'auto' }}>{children}</Box>
        <Divider />
        <Box sx={{ p: 2, pt: 1.5 }}>
          <Button fullWidth variant="contained" onClick={onClose}>
            {resultCount === undefined
              ? 'Show results'
              : `Show ${resultCount} ${resultCount === 1 ? 'result' : 'results'}`}
          </Button>
        </Box>
      </Drawer>
    );
  }

  return (
    <Collapse in={open} unmountOnExit>
      <Box
        id={id}
        // A hairline above rather than a boxed panel: this sits inside the
        // toolbar's own surface, and a second border there reads as a second
        // component.
        sx={{ pt: 2, mt: 0.5, borderTop: 1, borderColor: 'divider' }}
      >
        {children}
      </Box>
    </Collapse>
  );
}
