'use client';
import { useState } from 'react';
import { Box, Paper, TextField, IconButton, type SxProps, type Theme } from '@sinnapi/ui';
import { Search, ArrowForward } from '@sinnapi/ui/icons';
import { common, withAlpha } from '@sinnapi/ui/tokens';
import { SEARCH_PLACEHOLDERS } from './data/placeholders';
import { useRotatingPlaceholder, TRANSITION_MS } from './hooks/useRotatingPlaceholder';

// One placeholder row, in px. Sized to the 0.875rem input text so the rotating
// overlay lines up with where a typed value sits.
const LINE_HEIGHT = 20;

type NavSearchFormProps = {
  /** When true, styles for legibility over the dark hero overlay (translucent glass). */
  transparent?: boolean;
  /** Rotating marketing placeholders; defaults to the shared discovery copy. */
  placeholders?: string[];
  /** Styling for the form wrapper — lets callers control width/placement. */
  sx?: SxProps<Theme>;
};

/**
 * Slim discovery search — a plain GET form to `/vendors`, so the search itself
 * works without client JS and is crawlable. The placeholder is an animated
 * overlay that slides through aspirational prompts; it's purely decorative
 * (`aria-hidden`), the real <input> keeps a stable "Search vendors" label.
 * Styling adapts to a dark (transparent) or solid navbar surface.
 */
export default function NavSearchForm({
  transparent = false,
  placeholders = SEARCH_PLACEHOLDERS,
  sx,
}: NavSearchFormProps) {
  const [focused, setFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  // Pause rotation whenever the user is engaged with the field.
  const { index, animate } = useRotatingPlaceholder(placeholders.length, focused || hasValue);

  const showPlaceholder = !focused && !hasValue;
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
        <TextField
          name="q"
          variant="standard"
          fullWidth
          InputProps={{ disableUnderline: true }}
          inputProps={{ 'aria-label': 'Search vendors' }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => setHasValue(e.target.value.length > 0)}
          sx={{
            '& .MuiInputBase-input': {
              py: 0.5,
              fontSize: '0.875rem',
              color: transparent ? 'common.white' : 'text.primary',
            },
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
            opacity: showPlaceholder ? 1 : 0,
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
                    fontSize: '0.875rem',
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
