'use client';
import { Chip } from '@mui/material';
import { statusColor, titleizeStatus } from './statusColor';

export type StatusChipProps = {
  /** Raw enum value from the database, e.g. `release_requested`. */
  status: string;
  size?: 'small' | 'medium';
};

/**
 * Chip rendering a domain status with its canonical colour and label. Colourless
 * statuses render outlined so the chip row does not become a wall of grey fills.
 *
 * ## Why the label colour is not set here
 *
 * The ink on a filled chip is deliberately left to `palette.<color>.contrastText`.
 * A blanket `color: 'white'` was tried and is exactly wrong twice over: it erased
 * every outlined chip — white label on a white card, which is how `Public` came to
 * render as an empty pill on the vendor's listing card — and it also overrode the
 * dark ink that `warning` carries on purpose, so amber chips lost their contrast in
 * both schemes. The theme already computes an AA-legible ink per colour per scheme
 * (see `palette` in `../theme/tokens`); the chip's job is to pick the colour, not
 * to second-guess the ink.
 *
 * The outlined branch is the one case that does need saying, because MUI's default
 * `default`-coloured outline borrows `text.primary` on a transparent ground. Naming
 * `background.paper` keeps the chip legible when it sits on a tinted surface — the
 * gradient banner on `IdentityCard`, a hovered table row — rather than only on the
 * white card it was first drawn against.
 */
export function StatusChip({ status, size = 'small' }: StatusChipProps) {
  const color = statusColor(status);
  const outlined = color === 'default';

  return (
    <Chip
      size={size}
      color={color}
      label={titleizeStatus(status)}
      variant={outlined ? 'outlined' : 'filled'}
      sx={
        outlined
          ? { color: 'text.primary', borderColor: 'divider', bgcolor: 'background.paper' }
          : undefined
      }
    />
  );
}
