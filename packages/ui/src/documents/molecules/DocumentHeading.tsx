'use client';
import { Box } from '@mui/material';
import { PAPER } from '../paper';

type Tone = 'neutral' | 'warning' | 'success' | 'void';

const TONES: Record<Tone, { bg: string; ink: string }> = {
  neutral: { bg: '#F1EEF3', ink: PAPER.muted },
  warning: { bg: PAPER.warningTint, ink: PAPER.warningInk },
  success: { bg: '#E7F4E8', ink: PAPER.successInk },
  void: { bg: '#FDE5E5', ink: PAPER.voidInk },
};

type Props = {
  title: string;
  documentNo: string | null;
  /** The stamp under the number, e.g. "PARTLY PAID". */
  stamp?: { label: string; tone: Tone } | null;
};

/** "INVOICE / SNP-INV-48203917 / PARTLY PAID" — the top-right of the paper. */
export function DocumentHeading({ title, documentNo, stamp }: Props) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: { xs: 'flex-start', sm: 'flex-end' },
        gap: 0.75,
      }}
    >
      <Box
        component="div"
        sx={{
          fontSize: { xs: 22, sm: 28 },
          fontWeight: 700,
          letterSpacing: '3px',
          color: PAPER.ink,
          textAlign: { sm: 'right' },
        }}
      >
        {title}
      </Box>
      <Box sx={{ fontSize: 13, color: PAPER.muted, fontVariantNumeric: 'tabular-nums' }}>
        {documentNo ?? 'Draft — numbered when issued'}
      </Box>
      {stamp && (
        <Box
          sx={{
            mt: 0.25,
            px: 1.25,
            py: 0.4,
            borderRadius: 999,
            bgcolor: TONES[stamp.tone].bg,
            color: TONES[stamp.tone].ink,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.8px',
          }}
        >
          {stamp.label}
        </Box>
      )}
    </Box>
  );
}

export type { Tone as DocumentStampTone };
