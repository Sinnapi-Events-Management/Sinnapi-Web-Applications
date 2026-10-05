'use client';
import { Box, Paper, IconButton } from '@sinnapi/ui/atoms';
import { type Theme } from '@sinnapi/ui/theme';
import { type SxProps } from '@sinnapi/ui/system';
import { Search, ArrowForward } from '@mui/icons-material';
import { common, withAlpha } from '@sinnapi/ui/tokens';
import { SEARCH_PLACEHOLDERS } from '../data/placeholders';
import { useRotatingPlaceholder, TRANSITION_MS } from '../hooks/useRotatingPlaceholder';

// One placeholder row, in px. Sized to the input text so the rotating overlay
// lines up with where a typed value sits.
const LINE_HEIGHT = 20;

type SearchTriggerProps = {
  /** When true, styles for legibility over the dark hero overlay (translucent glass). */
  transparent?: boolean;
  /** Rotating marketing placeholders; defaults to the shared discovery copy. */
  placeholders?: string[];
  /** Styling for the form wrapper — lets callers control width/placement. */
  sx?: SxProps<Theme>;
  /** Mirrors the palette's text, so the pill is never out of step with it. */
  value: string;
  /** Open the palette, optionally carrying a character already typed here. */
  onOpen: (seed?: string) => void;
};

/**
 * The slim pill in the navbar's utility bar. Visually unchanged — same glass
 * surface, same sliding marketing placeholder — but it is now the way into
 * the search palette rather than the search itself.
 *
 * STILL A REAL GET FORM, ON PURPOSE
 * `action="/vendors" method="GET"` with a real `<input name="q">` means the
 * search works with no JavaScript at all and stays crawlable. The palette is
 * an enhancement layered on top; everything below is what remains when it
 * does not load.
 *
 * WHAT COUNTS AS "FOCUSED" HERE
 * The palette opens on a click or tap, and on the first character typed — not
 * on bare focus. That distinction is the whole accessibility argument for
 * this pattern. A pointer user clicking the field gets exactly the requested
 * behaviour: the box they touched lifts into the middle of the screen. But a
 * keyboard user merely Tabbing through the navbar on their way to "Sign in"
 * has not asked for anything, and throwing a modal in their path would be the
 * unannounced change of context WCAG 3.2.1 is about. For them the field stays
 * put until they press Enter, ArrowDown, or a letter — at which point the
 * palette opens carrying that letter, so nothing is lost either way.
 */
export default function SearchTrigger({
  transparent = false,
  placeholders = SEARCH_PLACEHOLDERS,
  sx,
  value,
  onOpen,
}: SearchTriggerProps) {
  // Pause rotation whenever the field is carrying text.
  const hasValue = value.length > 0;
  const { index, animate } = useRotatingPlaceholder(placeholders.length, hasValue);

  const accent = transparent ? withAlpha(common.white, 0.85) : 'text.disabled';
  const placeholderColor = transparent ? withAlpha(common.white, 0.7) : 'text.secondary';

  // Visible phrases plus a trailing clone of the first, so the wrap slides up.
  const items = [...placeholders, placeholders[0]];

  return (
    <Paper
      component="form"
      action="/vendors"
      method="GET"
      role="search"
      elevation={0}
      onSubmit={(event: React.FormEvent) => {
        // With JS present, submitting from the pill opens the palette on what
        // was typed rather than reloading onto /vendors — the suggestions are
        // the better answer, and they are one keystroke away.
        event.preventDefault();
        onOpen(value);
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        pl: 1.5,
        pr: 0.5,
        py: 0.25,
        borderRadius: 999,
        bgcolor: transparent ? withAlpha(common.white, 0.16) : 'action.hover',
        backdropFilter: transparent ? 'blur(8px)' : 'none',
        border: '1px solid',
        borderColor: transparent ? withAlpha(common.white, 0.28) : 'divider',
        transition: 'background-color .3s ease, border-color .3s ease',
        ...sx,
      }}
    >
      <Search fontSize="small" sx={{ color: accent }} />

      <Box sx={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <Box
          component="input"
          name="q"
          type="search"
          autoComplete="off"
          aria-label="Search vendors"
          // Announces that activating this field opens the palette, which is
          // the one thing a screen-reader user cannot see happen.
          aria-haspopup="dialog"
          value={value}
          onClick={() => onOpen()}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => onOpen(event.target.value)}
          onKeyDown={(event: React.KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === 'ArrowDown') {
              event.preventDefault();
              onOpen(value);
            }
          }}
          sx={{
            width: '100%',
            border: 0,
            outline: 'none',
            bgcolor: 'transparent',
            font: 'inherit',
            fontSize: '1.2rem',
            py: 0.5,
            color: transparent ? common.white : 'text.primary',
            '&::-webkit-search-cancel-button': { display: 'none' },
            // The rotating overlay below is the placeholder; the native one
            // would print underneath it.
            '&::placeholder': { color: 'transparent' },
          }}
        />

        {/* Sliding marketing placeholder — decorative; hidden once the user types. */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
            opacity: hasValue ? 0 : 1,
            transition: 'opacity .2s ease',
          }}
        >
          <Box sx={{ height: LINE_HEIGHT, width: '100%', overflow: 'hidden' }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                transform: `translateY(-${index * LINE_HEIGHT}px)`,
                transition: animate
                  ? `transform ${TRANSITION_MS}ms cubic-bezier(.22,.61,.36,1)`
                  : 'none',
              }}
            >
              {items.map((text, i) => (
                <Box
                  key={i}
                  sx={{
                    height: LINE_HEIGHT,
                    lineHeight: `${LINE_HEIGHT}px`,
                    fontSize: '1.15rem',
                    color: placeholderColor,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {text}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      <IconButton
        type="submit"
        size="small"
        aria-label="Search"
        sx={{
          color: transparent ? 'primary.dark' : 'common.white',
          bgcolor: transparent ? 'common.white' : 'primary.main',
          '&:hover': { bgcolor: transparent ? withAlpha(common.white, 0.85) : 'primary.dark' },
        }}
      >
        <ArrowForward fontSize="small" />
      </IconButton>
    </Paper>
  );
}
