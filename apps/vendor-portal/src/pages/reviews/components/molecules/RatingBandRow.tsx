import { alpha, Box, Rating, Stack, Typography } from '@sinnapi/ui';
import type { RatingBand } from '../../schema';

type Props = {
  band: RatingBand;
  selected: boolean;
  /** True while any score is selected — dims the bands that are not it. */
  dimmed: boolean;
  onSelect: () => void;
};

/**
 * One score in the distribution, and the control that filters the list to it.
 *
 * The bar *is* the filter rather than sitting beside one. A vendor reading "six
 * 2★ reviews" immediately wants to read those six, and making them carry that
 * number over to a separate dropdown is the step where the insight gets
 * abandoned. Selecting the same score again clears it, so the row toggles.
 *
 * The track is tinted from `text.primary` rather than set to a grey: composited
 * with `alpha` it stays a faint recess of whatever surface it lands on, which a
 * fixed grey cannot do on both the pale gold canvas and the warm dark one.
 *
 * The count sits in a fixed-width column so the bars all start and end on the
 * same two lines. Letting it size to its content would ragged the right edge
 * the moment one score crossed into double digits.
 */
export default function RatingBandRow({ band, selected, dimmed, onSelect }: Props) {
  return (
    <Stack
      component="button"
      type="button"
      onClick={onSelect}
      direction="row"
      alignItems="center"
      spacing={1.5}
      aria-pressed={selected}
      aria-label={`${band.star} star: ${band.count} ${band.count === 1 ? 'review' : 'reviews'}`}
      sx={{
        width: '100%',
        px: 1,
        py: 0.75,
        border: 0,
        borderRadius: 2,
        cursor: 'pointer',
        textAlign: 'left',
        font: 'inherit',
        color: 'inherit',
        bgcolor: selected ? 'action.selected' : 'transparent',
        // Unselected bands recede rather than disappear: the shape of the whole
        // distribution is still the context for the one being read.
        opacity: dimmed && !selected ? 0.55 : 1,
        transition: (theme) => theme.transitions.create(['background-color', 'opacity']),
        '&:hover': { bgcolor: 'action.hover', opacity: 1 },
        '&:focus-visible': { outline: (theme) => `2px solid ${theme.palette.secondary.main}` },
      }}
    >
      <Rating value={band.star} max={5} readOnly size="small" sx={{ flexShrink: 0 }} />

      <Box
        sx={{
          flex: 1,
          minWidth: 40,
          height: 8,
          borderRadius: 4,
          overflow: 'hidden',
          bgcolor: (theme) => alpha(theme.palette.text.primary, 0.08),
        }}
      >
        <Box
          sx={{
            width: `${Math.round(band.share * 100)}%`,
            height: '100%',
            borderRadius: 4,
            bgcolor: 'secondary.main',
            transition: (theme) => theme.transitions.create('width'),
          }}
        />
      </Box>

      <Typography
        variant="body2"
        sx={{ width: 32, textAlign: 'right', fontWeight: 600, flexShrink: 0 }}
      >
        {band.count}
      </Typography>
    </Stack>
  );
}
