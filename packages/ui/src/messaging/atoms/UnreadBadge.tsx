'use client';
import { Box } from '@mui/material';

export type UnreadBadgeProps = {
  count: number;
  /** Anything above this renders as "N+". */
  max?: number;
  /** Muted threads keep the count but drop the colour that demands attention. */
  muted?: boolean;
};

/**
 * The unread count pill on an inbox row.
 *
 * Not MUI's `<Badge />`: that positions itself against an anchor element, and
 * this sits inline at the end of a flex row with no anchor to hang off. A pill
 * that stays circular at one digit and grows into a lozenge at two also needs
 * `minWidth` rather than a fixed size, which the badge does not offer.
 *
 * A muted thread still shows its count — the user asked for silence, not for
 * the information to disappear — but in the neutral ink, so it stops competing
 * with the threads that do want an answer.
 */
export function UnreadBadge({ count, max = 99, muted = false }: UnreadBadgeProps) {
  if (count <= 0) return null;

  return (
    <Box
      component="span"
      aria-label={`${count} unread ${count === 1 ? 'message' : 'messages'}`}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 20,
        height: 20,
        px: 0.75,
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
        bgcolor: muted ? 'action.selected' : 'primary.main',
        color: muted ? 'text.secondary' : 'primary.contrastText',
      }}
    >
      {count > max ? `${max}+` : count}
    </Box>
  );
}
