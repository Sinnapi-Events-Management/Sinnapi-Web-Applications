import { Typography } from '@sinnapi/ui';

type EventCardMetaProps = {
  /** Already formatted for display — this component does no date maths. */
  date: string | null;
  location: string | null;
};

/**
 * The card's when-and-where line: `16 Sept 2026 · Kampala`.
 *
 * One line of secondary text rather than a strip of icon rows, matching the
 * client portal's event card exactly — the two portals show the same object and
 * a vendor who is also a client should not have to re-learn it.
 *
 * `noWrap` matters here: `events.location` is free text a client typed, so
 * "Serena Hotel, Kintu Road, Kampala Central" is a normal value and wrapping it
 * pushes the description and the budget down on that one card. Truncating keeps
 * the row a row, and the full string is one card-click away on the event page.
 *
 * A missing half is dropped rather than dashed, so a brief with no venue does
 * not read as `16 Sept 2026 · —`. With neither, the line does not draw at all.
 */
export default function EventCardMeta({ date, location }: EventCardMetaProps) {
  const parts = [date, location].filter(Boolean);
  if (parts.length === 0) return null;

  return (
    <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
      {parts.join(' · ')}
    </Typography>
  );
}
