import { useCallback, useMemo, useState } from 'react';
import { useNow } from '@sinnapi/ui';
import {
  usePromotions as usePromotionsQuery,
  usePromotionDiscounts as usePromotionDiscountsQuery,
  useOfferTargets,
  usePackages,
  useServices,
} from '@/hooks/queries';
import {
  toPromotionCounts,
  toPromotionKpis,
  toPromotionRows,
  type PromotionFilter,
  type PromotionRow,
} from '../schema';

/**
 * The campaign list, what it is measuring, and the editor state around it.
 *
 * Two reads are joined here rather than in a card, so a card is handed a row
 * and renders it. A card that fetched its own codes would issue one query per
 * campaign and would make "redemptions" a per-card responsibility — which is
 * how two cards end up counting the same number differently.
 *
 * Every derived state runs off one `now`, ticked by `useNow`. A promotion whose
 * last day passes while the tab is open flips from Live to Ended on its own
 * rather than lying until someone reloads — which is the whole reason status is
 * derived here instead of read off `is_active`.
 *
 * `editing` holds the promotion rather than its id so the dialog can seed its
 * form synchronously from data the list already has; fetching it again on open
 * would put a spinner in front of a form the browser could already draw.
 */
export function usePromotions(vendorId: string) {
  const promotions = usePromotionsQuery(vendorId);
  const discounts = usePromotionDiscountsQuery(vendorId);
  // The catalogue and the targets turn "Festive Season" into "Festive Season,
  // on Full Day Wedding and 2 more". Secondary in every sense: a slow or failed
  // read costs each card its coverage line and nothing else.
  const targets = useOfferTargets(vendorId);
  const packages = usePackages(vendorId);
  const services = useServices(vendorId);
  // Hourly: every boundary on this screen is a calendar day, so a minute tick
  // would re-render the grid sixty times for nothing.
  const now = useNow(3_600_000);

  const [filter, setFilter] = useState<PromotionFilter>('all');
  const [editing, setEditing] = useState<PromotionRow | null>(null);
  const [isEditorOpen, setEditorOpen] = useState(false);
  /**
   * A campaign that saved but whose scope did not.
   *
   * Surfaced on the screen rather than in the dialog because by the time it
   * happens the dialog's subject — the campaign — has been written. Holding the
   * dialog open on it would invite the vendor to submit again and create a
   * second campaign; closing silently would leave them believing a sale covers
   * four packages when it covers their whole catalogue.
   */
  const [editorWarning, setEditorWarning] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      toPromotionRows(
        promotions.data ?? [],
        discounts.data ?? [],
        now,
        targets.data ?? [],
        packages.data ?? [],
        services.data ?? [],
      ),
    [promotions.data, discounts.data, now, targets.data, packages.data, services.data],
  );

  const visible = useMemo(
    () => (filter === 'all' ? rows : rows.filter((row) => row.status === filter)),
    [rows, filter],
  );

  const counts = useMemo(() => toPromotionCounts(rows), [rows]);
  const kpis = useMemo(() => toPromotionKpis(rows), [rows]);

  const create = useCallback(() => {
    setEditing(null);
    setEditorWarning(null);
    setEditorOpen(true);
  }, []);

  const edit = useCallback((promotion: PromotionRow) => {
    setEditing(promotion);
    setEditorWarning(null);
    setEditorOpen(true);
  }, []);

  // Cleared on close as well as on open, so a re-open before the next render
  // cannot flash the previous campaign's copy.
  const closeEditor = useCallback((warning?: string) => {
    setEditorOpen(false);
    setEditing(null);
    setEditorWarning(warning ?? null);
  }, []);

  return {
    rows,
    visible,
    counts,
    kpis,
    filter,
    setFilter,
    /** The clock every derived state on this screen was resolved against. */
    now,
    // Only the campaigns gate the screen. A failed or slow codes read costs the
    // cards their redemption line and nothing else, so it must not blank a page
    // whose subject is the campaigns.
    isLoading: promotions.isLoading,
    error: promotions.error,
    codesLoading: discounts.isLoading,
    isEmpty: rows.length === 0,
    /** True when there are campaigns but none under the current tab. */
    isFiltered: rows.length > 0 && visible.length === 0,
    editing,
    isEditorOpen,
    editorWarning,
    dismissEditorWarning: () => setEditorWarning(null),
    create,
    edit,
    closeEditor,
  };
}
