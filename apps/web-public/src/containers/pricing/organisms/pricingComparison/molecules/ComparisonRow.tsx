import { Box, Typography } from '@sinnapi/ui/atoms';
import { Check, Remove } from '@mui/icons-material';
import { withAlpha, palette } from '@sinnapi/ui/tokens';
import type { CellValue } from '../utils/featureCatalogue';
import type { ComparisonColumn, ComparisonRowModel } from '../hooks/usePlanComparison';
import { comparisonGrid } from '../utils/comparisonGrid';

/**
 * One cell. The tick and dash carry the whole meaning of a boolean row, so each
 * gets a label — to a screen reader an unlabelled icon row is a wall of
 * "graphic", with no way to tell an included feature from an excluded one.
 */
function Cell({ value }: { value: CellValue }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check fontSize="small" color="primary" aria-label="Included" role="img" />
    ) : (
      <Remove
        fontSize="small"
        sx={{ color: 'text.disabled' }}
        aria-label="Not included"
        role="img"
      />
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
 * flagged column is tinted to echo the popular plan card above.
 *
 * Cells are positional — `row.values[i]` belongs to `columns[i]` — which is what
 * the hook guarantees by building both from the same column list.
 */
export default function ComparisonRow({
  row,
  columns,
}: {
  row: ComparisonRowModel;
  columns: ComparisonColumn[];
}) {
  return (
    <Box sx={{ ...comparisonGrid(columns.length), borderTop: 1, borderColor: 'divider' }}>
      <Typography variant="body2" sx={{ py: 1.5, pr: 2 }}>
        {row.label}
      </Typography>
      {columns.map((column, index) => (
        <Box
          key={column.key}
          sx={{
            py: 1.5,
            px: 1,
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            bgcolor: column.highlight ? withAlpha(palette.light.primary.main, 0.04) : 'transparent',
          }}
        >
          <Cell value={row.values[index]} />
        </Box>
      ))}
    </Box>
  );
}
