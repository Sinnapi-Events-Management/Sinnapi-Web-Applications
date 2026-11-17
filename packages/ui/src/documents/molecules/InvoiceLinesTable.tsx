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
 * Below `sm` each line is stacked — the item, then "qty × price" and its
 * amount — instead of a four-column table. The table used to scroll sideways
 * on phones, which nobody discovered: the unit and amount columns simply
 * looked cut off ("5" for 599,962). (2026-11-17)
 */
export function InvoiceLinesTable({
  items,
  currency,
}: {
  items: InvoiceLineView[];
  currency: string;
}) {
  const qty = (n: number) => n.toLocaleString('en-UG', { maximumFractionDigits: 2 });
  return (
    <>
      <Box sx={{ display: { xs: 'block', sm: 'none' }, color: PAPER.ink, fontSize: 13 }}>
        <Box
          sx={{
            ...HEAD_SX,
            textAlign: 'left',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>ITEM</span>
          <span>AMOUNT</span>
        </Box>
        {items.length === 0 && (
          <Box sx={{ py: 1.5, color: PAPER.muted, borderBottom: `1px solid ${PAPER.hairline}` }}>
            No items yet.
          </Box>
        )}
        {items.map((item, i) => (
          <Box
            key={`m-${i}-${item.description}`}
            sx={{ py: 1.25, borderBottom: `1px solid ${PAPER.hairline}` }}
          >
            <Box sx={{ lineHeight: 1.45, overflowWrap: 'anywhere', fontWeight: 600 }}>
              {item.description}
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 1,
                mt: 0.25,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <Box component="span" sx={{ color: PAPER.muted }}>
                {qty(item.quantity)} × {formatDocumentAmount(item.unitPrice, currency)}
              </Box>
              <Box component="span" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                {formatDocumentAmount(item.lineTotal, currency)}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
      <Box sx={{ overflowX: 'auto', display: { xs: 'none', sm: 'block' } }}>
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
    </>
  );
}
