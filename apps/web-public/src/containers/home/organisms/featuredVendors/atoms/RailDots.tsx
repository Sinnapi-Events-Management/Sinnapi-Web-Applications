'use client';
import { Box, Stack } from '@sinnapi/ui/atoms';

/**
 * Page indicator for the rail. One dot per *page* (not per card), so at wide
 * breakpoints — where four cards are visible at once — a 12-vendor rail reads as
 * three dots rather than twelve. Hidden when everything already fits on one page.
 *
 * Dots are real buttons: they are the keyboard/assistive route to a page for
 * anyone who can't drag the track.
 */
export default function RailDots({
  count,
  selectedIndex,
  onSelect,
}: {
  count: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  if (count <= 1) return null;

  return (
    <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 3 }}>
      {Array.from({ length: count }, (_, index) => {
        const isActive = index === selectedIndex;
        return (
          <Box
            key={index}
            component="button"
            type="button"
            aria-label={`Go to featured vendors page ${index + 1}`}
            aria-current={isActive ? 'true' : undefined}
            onClick={() => onSelect(index)}
            sx={{
              p: 0,
              border: 0,
              cursor: 'pointer',
              height: 8,
              // The active page widens into a pill instead of changing colour
              // alone, so position is legible without relying on hue.
              width: isActive ? 24 : 8,
              borderRadius: 999,
              bgcolor: isActive ? 'primary.main' : 'divider',
              transition: 'width .25s ease, background-color .25s ease',
              '&:hover': { bgcolor: isActive ? 'primary.dark' : 'text.disabled' },
            }}
          />
        );
      })}
    </Stack>
  );
}
