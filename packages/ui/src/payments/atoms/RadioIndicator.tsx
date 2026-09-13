'use client';
import { Box } from '@mui/material';

export type RadioIndicatorProps = {
  checked: boolean;
};

/**
 * The drawn radio dot for a card-style option.
 *
 * Presentational only — the card around it carries `role="radio"` and
 * `aria-checked`, so this is hidden from assistive tech rather than being a
 * second, unlabeled control announced inside the first.
 */
export function RadioIndicator({ checked }: RadioIndicatorProps) {
  return (
    <Box
      aria-hidden
      sx={{
        flexShrink: 0,
        width: 20,
        height: 20,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        border: '2px solid',
        borderColor: checked ? 'secondary.main' : 'text.disabled',
        transition: 'border-color .15s',
        '&::after': {
          content: '""',
          width: 10,
          height: 10,
          borderRadius: '50%',
          bgcolor: 'secondary.main',
          transform: checked ? 'scale(1)' : 'scale(0)',
          transition: 'transform .15s ease-out',
        },
      }}
    />
  );
}
