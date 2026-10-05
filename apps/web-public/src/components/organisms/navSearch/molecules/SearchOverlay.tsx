'use client';
import { useId } from 'react';
import { Box, Paper, Stack, IconButton, Typography, Modal, Fade } from '@sinnapi/ui/atoms';
import { Search, Close, ArrowForward } from '@mui/icons-material';
import { withAlpha, common } from '@sinnapi/ui/tokens';
import { optionId } from '../utils/suggestions';
import SuggestionPanel from './SuggestionPanel';
import type { useNavSearch } from '../hooks/useNavSearch';

/**
 * The search palette: one centred card holding the real input and its
 * suggestions, over a dimmed page.
 *
 * WHY A MODAL AND NOT A DROPDOWN UNDER THE NAVBAR
 * The navbar field is 380px wide and lives in a bar that is translucent over
 * the homepage hero. A suggestion list hung off it inherits both problems —
 * too narrow to show a vendor name and its town without truncating, and
 * sitting on a surface whose contrast changes as the page scrolls. Lifting it
 * into its own centred surface gives the list a predictable background, a
 * readable width, and the darkened page behind it that Baymard found
 * materially improves how well people can attend to the suggestions.
 *
 * Centred on both axes, which is also what makes one component serve the
 * phone: the same card simply grows to the width of the viewport's gutters.
 *
 * WHAT THE MODAL BUYS US, AND WHAT IT COSTS
 * Buys: a focus trap, a scroll lock, Escape-to-close, `aria-modal`, and an
 * inert background — all of which this would otherwise have to reimplement,
 * and all of which it genuinely needs, because it covers the page.
 *
 * Costs: moving a field after it is focused is the manoeuvre WCAG 3.2.1 warns
 * about. Three things keep it on the right side of that line. The visitor's
 * own action opens it, the typed text carries across so nothing is lost, and
 * Escape puts them back exactly where they were — so it is a change of
 * content they asked for, not a change of context they did not. What it must
 * never become is an overlay that opens from a stray Tab landing on the
 * trigger; see `SearchTrigger` for how that is avoided.
 *
 * `disableRestoreFocus` is deliberately NOT set: on close, focus returns to
 * the navbar field, which is where the visitor left it.
 */
export default function SearchOverlay({ search }: { search: ReturnType<typeof useNavSearch> }) {
  const listboxId = useId();

  return (
    <Modal
      open={search.open}
      onClose={search.close}
      closeAfterTransition
      aria-label="Search Sinnapi"
      slotProps={{
        backdrop: {
          // Heavier than the MUI default: the point of the scrim is to take
          // the hero photo, the nav and the page behind it out of contention.
          sx: { backgroundColor: withAlpha(common.black, 0.6), backdropFilter: 'blur(3px)' },
        },
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Fade in={search.open}>
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 640,
            maxHeight: 'calc(100dvh - 32px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 32px 80px -24px rgba(4, 46, 44, 0.55)',
            // Fade alone on the backdrop, but the card also rises slightly —
            // suppressed for anyone who has asked for less movement.
            '@media (prefers-reduced-motion: no-preference)': {
              animation: 'navSearchRise .18s cubic-bezier(.22,.61,.36,1)',
            },
            '@keyframes navSearchRise': {
              from: { opacity: 0, transform: 'translateY(8px) scale(.985)' },
              to: { opacity: 1, transform: 'none' },
            },
          }}
        >
          <Box
            component="form"
            role="search"
            action="/vendors"
            method="GET"
            onSubmit={(event: React.FormEvent) => {
              event.preventDefault();
              search.submit();
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 2.5,
              py: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Search sx={{ color: 'text.secondary' }} />

            <Box
              component="input"
              // The ARIA combobox contract. `aria-expanded` tracks whether
              // there is anything in the listbox rather than whether the card
              // is open: the listbox element is mounted for the life of the
              // palette, but announcing it as expanded while it holds a
              // skeleton or an empty state tells a screen-reader user to go
              // looking for options that are not there.
              role="combobox"
              aria-expanded={search.rows.length > 0}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={
                search.activeIndex >= 0 ? optionId(listboxId, search.activeIndex) : undefined
              }
              aria-label="Search vendors and events"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              name="q"
              type="search"
              // The palette only ever mounts in response to a deliberate
              // action, so taking focus on mount is expected rather than a
              // surprise — and without it the visitor would have to click
              // again into the field they just opened.
              autoFocus
              ref={search.inputRef}
              value={search.value}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                search.change(event.target.value)
              }
              onKeyDown={search.handleKeyDown}
              placeholder="Search vendors, towns, services or events…"
              sx={{
                flex: 1,
                minWidth: 0,
                border: 0,
                outline: 'none',
                bgcolor: 'transparent',
                color: 'text.primary',
                font: 'inherit',
                fontSize: '1.125rem',
                py: 0.75,
                // Safari paints its own clear button on type="search"; ours
                // is below, and two of them is one too many.
                '&::-webkit-search-cancel-button': { display: 'none' },
                '&::placeholder': { color: 'text.disabled', opacity: 1 },
              }}
            />

            {search.typed && (
              <IconButton size="small" aria-label="Clear search" onClick={search.clear}>
                <Close fontSize="small" />
              </IconButton>
            )}

            <IconButton
              type="submit"
              size="small"
              aria-label="Search"
              sx={{
                color: 'common.white',
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              <ArrowForward fontSize="small" />
            </IconButton>
          </Box>

          <SuggestionPanel
            listboxId={listboxId}
            rows={search.rows}
            term={search.term}
            typed={search.typed}
            activeIndex={search.activeIndex}
            activeRef={search.activeRef}
            isLoading={search.isLoading}
            isRefreshing={search.isRefreshing}
            isEmpty={search.isEmpty}
            isTooShort={search.isTooShort}
            onSelect={search.select}
            onHover={search.setActiveIndex}
            onSubmit={search.submit}
          />

          <Stack
            direction="row"
            sx={{
              display: { xs: 'none', sm: 'flex' },
              gap: 2,
              px: 2.5,
              py: 1,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'action.hover',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              ↑↓ to navigate
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ↵ to open
            </Typography>
            <Typography variant="caption" color="text.secondary">
              esc to close
            </Typography>
          </Stack>
        </Paper>
      </Fade>
    </Modal>
  );
}
