import { Box, Button, Stack, Typography } from '@sinnapi/ui';
import { formatIsoDateLong } from '@sinnapi/ui';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { alpha } from '@mui/material/styles';

type Props = {
  /** The first free day from today, or `null` when the vendor is solid for a year. */
  date: string | null;
  /** True when that day is already on the month being shown. */
  inView: boolean;
  onShowMonth: () => void;
  onRequest: () => void;
};

/**
 * The answer to the question a blocked date provokes.
 *
 * Research on booking calendars is consistent about where they lose people: not
 * at "your date is taken" but at the month-by-month hunt for one that isn't.
 * Naming the next free day — and offering to jump the grid to it — turns that
 * hunt into a single tap.
 *
 * Stacks under 600px so neither the date nor the two actions get squeezed into
 * a two-word column on a phone.
 */
export default function NextAvailableCallout({ date, inView, onShowMonth, onRequest }: Props) {
  if (!date) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        This vendor has no open days in the year ahead. Message them — they may be able to
        rearrange, or suggest someone who can help.
      </Typography>
    );
  }

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 1.5, sm: 2 }}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      sx={{
        mb: 2.5,
        p: { xs: 1.75, sm: 2 },
        borderRadius: 2,
        bgcolor: (t) => alpha(t.palette.success.main, t.palette.mode === 'dark' ? 0.14 : 0.08),
        border: (t) => `1px solid ${alpha(t.palette.success.main, 0.28)}`,
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
        <Box component={EventAvailableIcon} aria-hidden sx={{ color: 'success.main' }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Next open date
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {formatIsoDateLong(date)}
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
        {/* Pointless when the day is already on screen, and a button that does
            nothing visible is worse than no button. */}
        {!inView && (
          <Button size="small" onClick={onShowMonth}>
            Show in calendar
          </Button>
        )}
        <Button size="small" variant="contained" onClick={onRequest}>
          Request this date
        </Button>
      </Stack>
    </Stack>
  );
}
