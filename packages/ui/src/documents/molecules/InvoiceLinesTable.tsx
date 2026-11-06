'use client';
import { Box } from '@mui/material';
import { PAPER } from '../paper';
import { formatDocumentAmount } from '../money';
import type { InvoiceLineView } from '../types';

const HEAD_SX = {
  textAlign: 'right' as const,
  pb: 1.25,
  fontSize: 10.5,
  letterSpacing: '1px',
  color: PAPER.muted,
  borderBottom: `1.5px solid ${PAPER.ink}`,
  fontWeight: 700,
  whiteSpace: 'nowrap' as const,
};
const CELL_SX = {
  py: 1.5,
  borderBottom: `1px solid ${PAPER.hairline}`,
  textAlign: 'right' as const,
  verticalAlign: 'top',
  whiteSpace: 'nowrap' as const,
  fontVariantNumeric: 'tabular-nums',
};

/**
 * The goods and services on an invoice. Extra charges (transport, service)
 * are not here — they sit in the summary under the discount, because the
 * discount does not apply to them.
 *
 * Scrolls sideways inside its own box on a phone rather than squeezing four
 * money columns into 320px.
 */
export function InvoiceLinesTable({
  items,
  currency,
}: {
  items: InvoiceLineView[];
  currency: string;
}) {
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box
        component="table"
        sx={{
          width: '100%',
          minWidth: 460,
          borderCollapse: 'collapse',
          fontSize: 13,
          color: PAPER.ink,
        }}
      >
        <thead>
          <tr>
            <Box component="th" sx={{ ...HEAD_SX, textAlign: 'left' }}>
              DESCRIPTION
            </Box>
            <Box component="th" sx={{ ...HEAD_SX, width: 60 }}>
              QTY
            </Box>
            <Box component="th" sx={{ ...HEAD_SX, width: 120 }}>
              UNIT PRICE
            </Box>
            <Box component="th" sx={{ ...HEAD_SX, width: 130 }}>
              AMOUNT
            </Box>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <Box
                component="td"
                colSpan={4}
                sx={{ ...CELL_SX, textAlign: 'left', color: PAPER.muted }}
              >
                No items yet.
              </Box>
            </tr>
          )}
          {items.map((item, i) => (
            <tr key={`${i}-${item.description}`}>
              <Box
                component="td"
                sx={{
                  ...CELL_SX,
                  textAlign: 'left',
                  whiteSpace: 'normal',
                  pr: 1.5,
                  lineHeight: 1.45,
                  overflowWrap: 'anywhere',
                }}
              >
                {item.description}
              </Box>
              <Box component="td" sx={CELL_SX}>
                {item.quantity.toLocaleString('en-UG', { maximumFractionDigits: 2 })}
              </Box>
              <Box component="td" sx={CELL_SX}>
                {formatDocumentAmount(item.unitPrice, currency)}
              </Box>
              <Box component="td" sx={CELL_SX}>
                {formatDocumentAmount(item.lineTotal, currency)}
              </Box>
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  );
}
