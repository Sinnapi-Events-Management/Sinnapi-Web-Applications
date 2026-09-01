import { Box, Button, Stack, Typography } from '@sinnapi/ui';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { MAX_COMPARE } from '../../hooks/useQuoteCompare';

type Props = {
  count: number;
  canCompare: boolean;
  onCompare: () => void;
  onClear: () => void;
};

/**
 * The tray that appears once a quote is ticked.
 *
 * Comparison tools are found to fail as often at the SELECTION step as at the
 * reading step: a client ticks two boxes and then cannot find where the
 * comparison lives. So the affordance follows the selection instead of sitting
 * somewhere fixed — the moment anything is ticked, the way to act on it is on
 * screen and stays there.
 *
 * Sticky to the bottom of the section rather than to the viewport: it belongs
 * to the vendor board, and a bar pinned to the window would hang over the
 * recommendations panel below and over every other tab.
 */
export default function CompareSelectionBar({ count, canCompare, onCompare, onClear }: Props) {
  if (count === 0) return null;

  return (
    <Box
      sx={{
        position: 'sticky',
        bottom: 0,
        zIndex: 2,
        mt: 2,
        p: 1.5,
        borderRadius: 2,
        border: 1,
        borderColor: 'secondary.main',
        bgcolor: 'background.paper',
        boxShadow: 3,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
      >
        <Typography variant="body2" aria-live="polite">
          {count} of {MAX_COMPARE} selected
          {!canCompare && ' — pick one more to compare'}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="text" color="inherit" onClick={onClear}>
            Clear
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<CompareArrowsIcon />}
            disabled={!canCompare}
            onClick={onCompare}
          >
            Compare
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
