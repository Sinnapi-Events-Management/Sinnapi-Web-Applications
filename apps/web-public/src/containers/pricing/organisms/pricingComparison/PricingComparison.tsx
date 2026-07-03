import { Box, Container, Typography } from '@sinnapi/ui/atoms';
import { withAlpha, palette } from '@sinnapi/ui/tokens';
import { mutedSurface } from '@/lib/sx';
import SectionHeading from '@/components/molecules/sectionHeading';
import { COMPARISON_COLUMNS, COMPARISON_GROUPS } from './data/comparison';
import ComparisonRow, { COMPARISON_GRID } from './molecules/ComparisonRow';

/**
 * Feature comparison — the full plan-by-feature matrix below the cards, so buyers
 * can justify a tier line by line. Built as a CSS grid (the design system ships
 * no Table) inside a horizontally scrollable shell that keeps the columns aligned
 * on narrow screens.
 */
export default function PricingComparison() {
  return (
    <Box sx={{ ...mutedSurface, borderTop: 1, borderColor: 'divider' }}>
      <Container sx={{ py: { xs: 6, md: 9 } }}>
        <SectionHeading
          align="center"
          overline="Compare in detail"
          title="Every feature, side by side"
          subtitle="See exactly what each plan unlocks so you can pick with confidence."
        />

        {/* Horizontal scroll shell — the grid keeps a comfortable min width. */}
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: 640 }}>
            {/* Sticky-feel header row with the plan names. */}
            <Box
              sx={{
                ...COMPARISON_GRID,
                pb: 1.5,
                borderBottom: 2,
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Features
              </Typography>
              {COMPARISON_COLUMNS.map((col) => (
                <Box
                  key={col.key}
                  sx={{
                    textAlign: 'center',
                    py: 1,
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                    bgcolor: col.highlight
                      ? withAlpha(palette.light.primary.main, 0.08)
                      : 'transparent',
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, color: col.highlight ? 'primary.main' : 'text.primary' }}
                  >
                    {col.name}
                  </Typography>
                </Box>
              ))}
            </Box>

            {COMPARISON_GROUPS.map((group) => (
              <Box key={group.title}>
                <Typography
                  variant="overline"
                  color="text.disabled"
                  sx={{ display: 'block', fontWeight: 700, mt: 3, mb: 0.5 }}
                >
                  {group.title}
                </Typography>
                {group.rows.map((row) => (
                  <ComparisonRow key={row.label} row={row} />
                ))}
              </Box>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
