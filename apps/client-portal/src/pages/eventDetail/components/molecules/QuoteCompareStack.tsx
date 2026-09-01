import { Box, Divider, Stack, Typography } from '@sinnapi/ui';
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
 * The comparison on a phone — a deliberate second design, not the wide one
 * scaled down.
 *
 * WHY NOT JUST SCROLL THE TABLE. A three-column grid at 360px gives each value
 * about 90px, which wraps every amount mid-number, and horizontal scrolling
 * makes the reader move the page back and forth to compare two figures that are
 * supposed to be side by side. Shrinking a comparison table is the standard way
 * these are made unusable on a phone.
 *
 * So the axes swap. The ATTRIBUTE becomes the heading and the two or three
 * quotes sit under it as a short row — which is the comparison the client
 * actually wants to make, one question at a time, with the values close enough
 * together to read in a single glance. The vendor headers stay at the top so
 * the columns keep their identity, and the order of the attributes is the same
 * as the wide layout because both read from `COMPARE_ROWS`.
 */
export default function QuoteCompareStack({ rows, onAccept, acceptableIds }: Props) {
  const columns = `repeat(${rows.length}, minmax(0, 1fr))`;

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gridTemplateColumns: columns, gap: 1.5 }}>
        {rows.map((q) => (
          <CompareColumnHeader
            key={q.quotation_id}
            quote={q}
            canAccept={acceptableIds.includes(q.quotation_id)}
            onAccept={onAccept}
          />
        ))}
      </Box>

      {COMPARE_ROWS.map((row) => {
        const bestId = row.best?.(rows) ?? null;
        return (
          <Box key={row.key}>
            <Divider sx={{ mb: 1.25 }} />
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              {row.label}
            </Typography>
            {row.hint && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {row.hint}
              </Typography>
            )}
            <Box sx={{ display: 'grid', gridTemplateColumns: columns, gap: 1.5, mt: 0.75 }}>
              {rows.map((q) => (
                <CompareValue key={q.quotation_id} isBest={bestId === q.quotation_id}>
                  {row.render(q)}
                </CompareValue>
              ))}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}
