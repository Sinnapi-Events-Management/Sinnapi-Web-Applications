import { Box, Typography } from '@sinnapi/ui';
import { Check, Remove } from '@sinnapi/ui/icons';
import { withAlpha, palette } from '@sinnapi/ui/tokens';
import { COMPARISON_COLUMNS, type CellValue, type ComparisonRow as Row } from '../data/comparison';

/** Shared 4-column grid template so the header and every row stay aligned. */
export const COMPARISON_GRID = {
  display: 'grid',
  gridTemplateColumns: '1.6fr 1fr 1fr 1fr',
  alignItems: 'center',
};

function Cell({ value }: { value: CellValue }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check fontSize="small" color="primary" aria-label="Included" />
    ) : (
      <Remove fontSize="small" sx={{ color: 'text.disabled' }} aria-label="Not included" />
    );
  }
  return (
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {value}
    </Typography>
  );
}

/**
 * One feature row of the comparison grid: a label plus a cell per plan. The
 * flagged column is tinted to echo the popular plan card.
 */
export default function ComparisonRow({ row }: { row: Row }) {
  return (
    <Box sx={{ ...COMPARISON_GRID, borderTop: 1, borderColor: 'divider' }}>
      <Typography variant="body2" sx={{ py: 1.5, pr: 2 }}>
        {row.label}
      </Typography>
      {row.values.map((value, i) => (
        <Box
          key={COMPARISON_COLUMNS[i].key}
          sx={{
            py: 1.5,
            px: 1,
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            bgcolor: COMPARISON_COLUMNS[i].highlight
              ? withAlpha(palette.light.primary.main, 0.04)
              : 'transparent',
          }}
        >
          <Cell value={value} />
        </Box>
      ))}
    </Box>
  );
}
