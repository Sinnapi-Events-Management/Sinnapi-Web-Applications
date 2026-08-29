import { Link as RouterLink } from 'react-router-dom';
import { Box, Stack, Typography, IconBadge, StatusChip } from '@sinnapi/ui';
import EventNoteIcon from '@mui/icons-material/EventNote';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import type { ActivityModel } from '../../schema';

type Props = { entry: ActivityModel };

/**
 * One line of the vendor's own status trail: what moved, which record, and when.
 * Links straight to the record — the feed exists to get a vendor back to the
 * thing that changed, not to narrate it.
 */
export default function ActivityRow({ entry }: Props) {
  const booking = entry.kind === 'booking';

  return (
    <Stack
      component={RouterLink}
      to={entry.to}
      direction="row"
      spacing={1.5}
      alignItems="center"
      sx={{
        py: 1.25,
        px: 0.5,
        borderRadius: 2,
        textDecoration: 'none',
        color: 'inherit',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <IconBadge accent={booking ? 'primary' : 'secondary'} size={32} iconSize={17}>
        {booking ? <EventNoteIcon /> : <RequestQuoteIcon />}
      </IconBadge>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          {entry.label} {entry.reference}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {entry.occurredAt}
        </Typography>
      </Box>

      <StatusChip status={entry.status} size="small" />
    </Stack>
  );
}
