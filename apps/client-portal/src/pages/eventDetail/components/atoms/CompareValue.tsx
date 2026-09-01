import type { ReactNode } from 'react';
import { Box, Typography } from '@sinnapi/ui';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

type Props = {
  children: ReactNode;
  /** This column wins the attribute. See `COMPARE_ROWS.best`. */
  isBest?: boolean;
};

/**
 * One cell of a comparison, with the winner marked.
 *
 * COLOUR IS NOT THE ONLY SIGNAL. The best value gets a tick as well as a
 * colour, because roughly one man in twelve cannot reliably separate the green
 * from the surrounding text — and this is a screen about money where the mark
 * is the whole point of the layout. The `aria-label` on the icon says it in
 * words for anyone reading with neither.
 */
export default function CompareValue({ children, isBest }: Props) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
      {isBest && (
        <CheckCircleIcon
          role="img"
          aria-label="Best on this row"
          sx={{ fontSize: 16, color: 'success.main', mt: '2px', flexShrink: 0 }}
        />
      )}
      <Typography
        variant="body2"
        sx={{
          fontWeight: isBest ? 700 : 400,
          color: isBest ? 'success.main' : 'text.primary',
          fontVariantNumeric: 'tabular-nums',
          minWidth: 0,
        }}
      >
        {children}
      </Typography>
    </Box>
  );
}
