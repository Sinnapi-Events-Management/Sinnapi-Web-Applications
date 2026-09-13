import type { ReactNode } from 'react';
import { Box, Typography } from '@sinnapi/ui';
import { alpha } from '@mui/material/styles';

type Tone = 'secondary' | 'success';

type Props = {
  icon: ReactNode;
  tone: Tone;
  title: ReactNode;
  caption?: ReactNode;
  /** Draws the line down to the next stop. */
  connector?: boolean;
};

/**
 * One stop on a vertical money timeline: a tinted icon, what happens, when.
 *
 * Rendered as a list item so a sequence of stops is announced as an ordered
 * list — the order is the information.
 */
export default function TimelineStop({ icon, tone, title, caption, connector }: Props) {
  return (
    <Box
      component="li"
      sx={{
        display: 'grid',
        gridTemplateColumns: '36px minmax(0, 1fr)',
        columnGap: 1.5,
        position: 'relative',
        pb: connector ? 2 : 0,
      }}
    >
      {connector && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: 17,
            top: 40,
            bottom: 4,
            width: 2,
            borderRadius: 1,
            bgcolor: (t) => alpha(t.palette.text.primary, 0.12),
          }}
        />
      )}
      <Box
        aria-hidden
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          color: `${tone}.main`,
          bgcolor: (t) => alpha(t.palette[tone].main, 0.14),
          '& svg': { fontSize: 20 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, pt: 0.25 }}>
        <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.35 }}>
          {title}
        </Typography>
        {caption && (
          <Typography variant="caption" color="text.secondary" component="p">
            {caption}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
