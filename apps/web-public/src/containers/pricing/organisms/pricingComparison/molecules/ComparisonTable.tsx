import { Box, Typography } from '@sinnapi/ui/atoms';
import { withAlpha, palette } from '@sinnapi/ui/tokens';
import type { ComparisonColumn, ComparisonGroupModel } from '../hooks/usePlanComparison';
import { comparisonGrid } from '../utils/comparisonGrid';
import ComparisonRow from './ComparisonRow';

/**
 * The full plan-by-feature matrix, built as a CSS grid (the design system ships
 * no Table) inside a horizontally scrollable shell that keeps the columns
 * aligned on narrow screens.
 *
 * Purely presentational: the groups and their cells arrive resolved, so this
 * knows nothing about feature keys, sentinels or where any of it came from.
 */
export default function ComparisonTable({
  columns,
  groups,
}: {
  columns: ComparisonColumn[];
  groups: ComparisonGroupModel[];
}) {
  const grid = comparisonGrid(columns.length);

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box>
        {/* Header row with the plan names, echoing the cards' emphasis. */}
        <Box sx={{ ...grid, pb: 1.5, borderBottom: 2, borderColor: 'divider' }}>
          <Typography variant="subtitle2" color="text.secondary">
            Features
          </Typography>
          {columns.map((column) => (
            <Box
              key={column.key}
              sx={{
                textAlign: 'center',
                py: 1,
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                bgcolor: column.highlight
                  ? withAlpha(palette.light.primary.main, 0.08)
                  : 'transparent',
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  color: column.highlight ? 'primary.main' : 'text.primary',
                }}
              >
                {column.name}
              </Typography>
            </Box>
          ))}
        </Box>

        {groups.map((group) => (
          <Box key={group.title}>
            <Typography
              variant="overline"
              color="text.disabled"
              sx={{ display: 'block', fontWeight: 700, mt: 3, mb: 0.5 }}
            >
              {group.title}
            </Typography>
            {group.rows.map((row) => (
              <ComparisonRow key={row.label} row={row} columns={columns} />
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
