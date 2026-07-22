'use client';
import { Box, Container } from '@sinnapi/ui/atoms';
import { mutedSurface } from '@/lib/sx';
import SectionHeading from '@/components/molecules/sectionHeading';
import { usePlanComparison } from './hooks/usePlanComparison';
import ComparisonTable from './molecules/ComparisonTable';
import { ComparisonError, ComparisonSkeleton } from './molecules/ComparisonFallback';

/**
 * Feature comparison — the full plan-by-feature matrix below the cards, so
 * buyers can justify a tier line by line.
 *
 * Driven by `plan_features`, the same structured flags that decide what a
 * subscriber can actually do, so the table can't promise a capability the
 * platform won't grant. Its columns come from the plan catalogue under the key
 * the cards already populated, so this section renders from cache rather than
 * fetching the catalogue a second time.
 *
 * The whole section disappears when there is nothing to compare — an empty
 * matrix under a heading promising one reads as a bug, and the cards above
 * already carry the feature bullets.
 */
export default function PricingComparison() {
  const { columns, groups, isLoading, isError, refetch } = usePlanComparison();

  const hasMatrix = columns.length > 0 && groups.length > 0;
  if (!isLoading && !isError && !hasMatrix) return null;

  return (
    <Box sx={{ ...mutedSurface, borderTop: 1, borderColor: 'divider' }}>
      <Container sx={{ py: { xs: 6, md: 9 } }}>
        <SectionHeading
          align="center"
          overline="Compare in detail"
          title="Every feature, side by side"
          subtitle="See exactly what each plan unlocks so you can pick with confidence."
        />

        {isLoading ? (
          <ComparisonSkeleton />
        ) : isError && !hasMatrix ? (
          <ComparisonError onRetry={refetch} />
        ) : (
          <ComparisonTable columns={columns} groups={groups} />
        )}
      </Container>
    </Box>
  );
}
