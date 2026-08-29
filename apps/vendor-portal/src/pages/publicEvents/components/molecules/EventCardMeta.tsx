import type { ReactNode } from 'react';
import { Stack, Typography } from '@sinnapi/ui';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';

type MetaRowProps = { icon: ReactNode; children: ReactNode };

function MetaRow({ icon, children }: MetaRowProps) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
      {icon}
      <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
        {children}
      </Typography>
    </Stack>
  );
}

type EventCardMetaProps = {
  /** Already formatted for display — this component does no date maths. */
  date: string | null;
  location: string | null;
};

/**
 * The card's when-and-where line.
 *
 * Both rows are `noWrap`: `events.location` is free text a client typed, so
 * "Serena Hotel, Kintu Road, Kampala Central" is a normal value and wrapping it
 * pushes the description and the footer down on that one card. Truncating keeps
 * the row a row, and the full string is one card-click away.
 *
 * Neither row renders when its value is missing, so a brief that omits a venue
 * doesn't leave an empty icon behind.
 */
export default function EventCardMeta({ date, location }: EventCardMetaProps) {
  if (!date && !location) return null;

  return (
    <Stack
      direction="row"
      spacing={2}
      useFlexGap
      flexWrap="wrap"
      sx={{ color: 'text.secondary', mt: 1 }}
    >
      {date && <MetaRow icon={<EventIcon fontSize="inherit" />}>{date}</MetaRow>}
      {location && <MetaRow icon={<PlaceIcon fontSize="inherit" />}>{location}</MetaRow>}
    </Stack>
  );
}
