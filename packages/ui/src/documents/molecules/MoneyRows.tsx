'use client';
import { Box } from '@mui/material';
import { PAPER } from '../paper';

export type MoneyRow = {
  label: string;
  value: string;
  /** A rule above, bold — the "Total" line. */
  emphasis?: boolean;
};

type Props = {
  rows: MoneyRow[];
  /** The highlighted band at the bottom: "BALANCE DUE  UGX 2,235,000". */
  band?: { label: string; value: string } | null;
  width?: number | string;
};

/** The right-hand money summary of an invoice, and the balance table of a receipt. */
export function MoneyRows({ rows, band, width = 290 }: Props) {
  return (
    <Box
      sx={{
        width: { xs: '100%', sm: width },
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        fontSize: 13,
        color: PAPER.ink,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {rows.map((row) => (
        <Box
          key={row.label}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 2,
            py: row.emphasis ? 1.25 : 0.9,
            ...(row.emphasis && {
              borderTop: `1.5px solid ${PAPER.ink}`,
              mt: 0.5,
              fontWeight: 700,
            }),
          }}
        >
          <Box component="span" sx={{ color: row.emphasis ? PAPER.ink : PAPER.muted }}>
            {row.label}
          </Box>
          <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
            {row.value}
          </Box>
        </Box>
      ))}
      {band && (
        <Box
          sx={{
            mt: 1,
            px: 2,
            py: 1.75,
            borderRadius: '10px',
            bgcolor: PAPER.band,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box component="span" sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}>
            {band.label}
          </Box>
          <Box component="span" sx={{ fontSize: 19, fontWeight: 700, whiteSpace: 'nowrap' }}>
            {band.value}
          </Box>
        </Box>
      )}
    </Box>
  );
}
