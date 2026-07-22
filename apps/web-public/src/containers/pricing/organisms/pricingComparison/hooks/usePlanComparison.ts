'use client';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listPlanFeatures, listPricingPlans } from '@/lib/queries';
import type { PlanFeatureModel, PlanFeatureValue, PricingPlanModel } from '@/lib/types';
import { pricingKeys } from '../../../utils/pricingQueryKeys';
import {
  FEATURE_GROUPS,
  UNCATALOGUED_GROUP_TITLE,
  humanise,
  toCellValue,
  type CellValue,
} from '../utils/featureCatalogue';

/** A plan column: the header, and the identity every row's cells align to. */
export type ComparisonColumn = { key: string; name: string; highlight: boolean };

export type ComparisonRowModel = {
  label: string;
  /** One cell per column, in `columns` order. */
  values: CellValue[];
};

export type ComparisonGroupModel = { title: string; rows: ComparisonRowModel[] };

/** `{ [planKey]: { [featureKey]: value } }` — the flat triples, indexed. */
type FeatureIndex = Map<string, Map<string, PlanFeatureValue>>;

function indexFeatures(rows: PlanFeatureModel[]): FeatureIndex {
  const index: FeatureIndex = new Map();
  for (const row of rows) {
    const plan = index.get(row.plan_key) ?? new Map<string, PlanFeatureValue>();
    plan.set(row.feature_key, row.value);
    index.set(row.plan_key, plan);
  }
  return index;
}

/**
 * Builds the rendered matrix from the curated catalogue plus whatever the
 * database actually holds.
 *
 * A row is emitted only when at least one plan has an opinion on that feature,
 * so a capability we've stopped selling disappears from the table instead of
 * rendering a row of dashes that reads like a feature nobody gets.
 *
 * Keys present in the data but missing from the catalogue are not dropped: they
 * land in a trailing group with a humanised label. Silently hiding admin-entered
 * data is the worse failure — it looks like the feature doesn't exist, and
 * nobody would think to check a hard-coded array in the web app to find out why.
 */
function buildGroups(
  columns: ComparisonColumn[],
  features: PlanFeatureModel[],
): ComparisonGroupModel[] {
  const index = indexFeatures(features);
  const curated = new Set(FEATURE_GROUPS.flatMap((group) => group.features.map((f) => f.key)));

  const buildRow = (key: string, label: string): ComparisonRowModel | null => {
    const present = columns.some((column) => index.get(column.key)?.has(key));
    if (!present) return null;
    return {
      label,
      values: columns.map((column) => toCellValue(index.get(column.key)?.get(key))),
    };
  };

  const groups = FEATURE_GROUPS.map((group) => ({
    title: group.title,
    rows: group.features
      .map((feature) => buildRow(feature.key, feature.label))
      .filter((row): row is ComparisonRowModel => row !== null),
  })).filter((group) => group.rows.length > 0);

  // Stable order for the leftovers: first appearance in the data, which the RPC
  // sorts by (plan_key, feature_key) — so it's alphabetical, not arbitrary.
  const extraKeys = [...new Set(features.map((f) => f.feature_key))].filter(
    (key) => !curated.has(key),
  );
  const extraRows = extraKeys
    .map((key) => buildRow(key, humanise(key)))
    .filter((row): row is ComparisonRowModel => row !== null);

  return extraRows.length > 0
    ? [...groups, { title: UNCATALOGUED_GROUP_TITLE, rows: extraRows }]
    : groups;
}

/**
 * The comparison table's data.
 *
 * Two queries, and the first is deliberately the *same* one the plan cards use:
 * identical key, so the columns are served from cache rather than refetched, and
 * the table can never advertise a tier the cards above it don't show.
 *
 * The matrix is memoised on both results because building it is O(plans ×
 * features) map work that has no reason to run on an unrelated re-render.
 */
export function usePlanComparison() {
  const plansQuery = useQuery({
    queryKey: pricingKeys.plans(),
    queryFn: () => listPricingPlans(),
  });

  const featuresQuery = useQuery({
    queryKey: pricingKeys.features(),
    queryFn: () => listPlanFeatures(),
  });

  const columns = useMemo<ComparisonColumn[]>(
    () =>
      (plansQuery.data ?? []).map((plan: PricingPlanModel) => ({
        key: plan.key,
        name: plan.name,
        highlight: plan.highlight,
      })),
    [plansQuery.data],
  );

  const groups = useMemo(
    () => buildGroups(columns, featuresQuery.data ?? []),
    [columns, featuresQuery.data],
  );

  return {
    columns,
    groups,
    isLoading: plansQuery.isPending || featuresQuery.isPending,
    isError: plansQuery.isError || featuresQuery.isError,
    refetch: () => {
      plansQuery.refetch();
      featuresQuery.refetch();
    },
  };
}
