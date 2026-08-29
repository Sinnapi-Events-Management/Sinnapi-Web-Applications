import { useCallback, useEffect, useRef, useState } from 'react';
import { useMediaQuery, useTheme, FILTER_DISCLOSURE_BREAKPOINT } from '@sinnapi/ui';

export type FilterPanel = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

/**
 * Open/closed state for the facet panel the toolbar folds its dropdowns into.
 *
 * The one piece of judgement here is the auto-open: a vendor who arrives on a
 * *shared filtered link* on a wide screen gets the panel opened for them once,
 * so the filters that are shaping the feed are visible rather than folded. It
 * deliberately does not fire on a narrow screen — there the panel is a bottom
 * sheet, and opening a sheet over the results before the vendor has asked for
 * anything is a modal in the way of the thing they followed the link to see.
 *
 * `openedOnce` makes it a one-shot. Without it, closing the panel while filters
 * are still applied would re-open it on the next render that touched this
 * effect, which is a panel that cannot be dismissed.
 */
export function useFilterPanel(hasActiveFilters: boolean): FilterPanel {
  const theme = useTheme();
  const isRoomy = useMediaQuery(theme.breakpoints.up(FILTER_DISCLOSURE_BREAKPOINT));
  const [open, setOpen] = useState(false);
  const openedOnce = useRef(false);

  useEffect(() => {
    // `isRoomy` can start false and flip once `matchMedia` is read, so the
    // latch is set only when the panel actually opens — latching on the first
    // pass would consume the one-shot before the breakpoint was known.
    if (openedOnce.current || !hasActiveFilters || !isRoomy) return;
    openedOnce.current = true;
    setOpen(true);
  }, [isRoomy, hasActiveFilters]);

  const toggle = useCallback(() => {
    openedOnce.current = true;
    setOpen((prev) => !prev);
  }, []);

  const close = useCallback(() => {
    openedOnce.current = true;
    setOpen(false);
  }, []);

  return { open, toggle, close };
}
