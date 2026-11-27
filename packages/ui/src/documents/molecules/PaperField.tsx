'use client';
import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { PAPER } from '../paper';
import { PaperLabel } from '../atoms/PaperLabel';

type Props = {
  label: string;
  /** The main value, set a size up from the lines under it. */
  value?: ReactNode;
  lines?: string[];
  strong?: boolean;
  /** Keeps line breaks the vendor typed (payment instructions, notes). */
  preLine?: boolean;
};

/** One labelled block on the paper: "BILL TO / Sarah K. / Kampala". */
export function PaperField({ label, value, lines = [], strong, preLine }: Props) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: 0 }}>
      <PaperLabel>{label}</PaperLabel>
      {value !== undefined && value !== null && value !== '' && (
        <Box
          sx={{
            fontSize: strong ? 15 : 13.5,
            fontWeight: strong ? 700 : 400,
            color: PAPER.ink,
            lineHeight: 1.5,
            whiteSpace: preLine ? 'pre-line' : 'normal',
            overflowWrap: 'anywhere',
          }}
        >
          {value}
        </Box>
      )}
      {lines.map((line) => (
        <Box
          key={line}
          sx={{ fontSize: 12.5, color: PAPER.muted, lineHeight: 1.5, overflowWrap: 'anywhere' }}
        >
          {line}
        </Box>
      ))}
    </Box>
  );
}
