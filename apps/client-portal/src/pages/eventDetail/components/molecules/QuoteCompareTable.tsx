import { Box, Typography } from '@sinnapi/ui';
import type { QuoteComparisonModel } from '@/lib/types';
import { COMPARE_ROWS } from '../../schema';
import CompareColumnHeader from './CompareColumnHeader';
import CompareValue from '../atoms/CompareValue';

type Props = {
  rows: QuoteComparisonModel[];
  onAccept: (quotationId: string) => void;
  acceptableIds: string[];
};

/**
 * The comparison as columns — the wide layout.
 *
 * A CSS grid rather than a `<table>`, because the header cells are cards with
 * an avatar, a rating and a button, and a table row of those fights the
 * table's own layout algorithm at every breakpoint. The grid is given explicit
 * `role` attributes instead, so the structure a sighted reader gets from the
 * alignment is the structure a screen reader is told about.
 *
 * The attribute column is sticky. With three quotes on a laptop the grid can
 * still exceed the dialog's width, and a reader who scrolls right to see the
 * third column must not lose the labels telling them which row is which —
 * which is the failure that makes most comparison tables unreadable.
 */
export default function QuoteCompareTable({ rows, onAccept, acceptableIds }: Props) {
  const template = `minmax(150px, 190px) repeat(${rows.length}, minmax(190px, 1fr))`;

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box role="table" aria-label="Quote comparison" sx={{ minWidth: 'min-content' }}>
        <Box role="row" sx={{ display: 'grid', gridTemplateColumns: template, gap: 1.5 }}>
          {/* The empty corner cell above the attribute labels. */}
          <Box role="columnheader" aria-label="Attribute" sx={stickyLabelSx} />
          {rows.map((q) => (
            <Box role="columnheader" key={q.quotation_id}>
              <CompareColumnHeader
                quote={q}
                canAccept={acceptableIds.includes(q.quotation_id)}
                onAccept={onAccept}
              />
            </Box>
          ))}
        </Box>

        {COMPARE_ROWS.map((row) => {
          const bestId = row.best?.(rows) ?? null;
          return (
            <Box
              role="row"
              key={row.key}
              sx={{
                display: 'grid',
                gridTemplateColumns: template,
                gap: 1.5,
                alignItems: 'start',
                py: 1.25,
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <Box role="rowheader" sx={stickyLabelSx}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  {row.label}
                </Typography>
                {row.hint && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {row.hint}
                  </Typography>
                )}
              </Box>

              {rows.map((q) => (
                <Box role="cell" key={q.quotation_id}>
                  <CompareValue isBest={bestId === q.quotation_id}>{row.render(q)}</CompareValue>
                </Box>
              ))}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/**
 * The label column stays put while the value columns scroll under it.
 * `bgcolor` is required, not decorative — a transparent sticky cell lets the
 * scrolling values slide visibly beneath the labels.
 */
const stickyLabelSx = {
  position: 'sticky',
  left: 0,
  zIndex: 1,
  bgcolor: 'background.paper',
  pr: 1.5,
} as const;
