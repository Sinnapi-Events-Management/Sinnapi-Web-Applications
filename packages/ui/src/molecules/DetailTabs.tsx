'use client';
import type { ReactElement, ReactNode } from 'react';
import { Badge, Box, Tab, Tabs } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

export type DetailTabItem<T extends string> = {
  value: T;
  label: string;
  icon?: ReactElement;
  /**
   * A count to hang off the tab's icon — unread messages, outstanding items.
   * Zero and `undefined` both render nothing, so a caller can pass a live count
   * straight through without guarding it.
   *
   * On the icon rather than after the label, because the label is what the tab
   * is called and a number welded to the end of it changes the word the reader
   * is scanning for. The badge also has to survive the bar's horizontal scroll
   * on a phone, and an icon is a fixed-size anchor where a label is not.
   */
  badge?: number;
};

/**
 * Where the sticky bar comes to rest: exactly the height of the portal's fixed
 * top bar, so the tabs sit flush under it rather than floating over the page
 * with a strip of scrolling content showing through above them.
 */
export const DETAIL_TABS_STICKY_TOP = { xs: 56, sm: 64 } as const;

/** The `id` of a tab button, referenced by its panel's `aria-labelledby`. */
export function detailTabId(prefix: string, value: string): string {
  return `${prefix}-tab-${value}`;
}

/** The `id` of a panel, referenced by its tab's `aria-controls`. */
export function detailPanelId(prefix: string, value: string): string {
  return `${prefix}-panel-${value}`;
}

export type DetailTabsProps<T extends string> = {
  items: readonly DetailTabItem<T>[];
  value: T;
  onChange: (next: T) => void;
  /**
   * Namespaces the generated `id`s, so two tab sets on one page cannot point a
   * panel at the other set's tab. Must match the `idPrefix` given to the panels.
   */
  idPrefix: string;
  /** Names the tablist for screen readers, e.g. `Booking sections`. */
  ariaLabel: string;
  /**
   * Pins the bar under the portal's top bar while the panel scrolls. On by
   * default: the point of a detail page's tabs is that the next section is
   * always one tap away, and a bar that scrolls out of reach is a bar the
   * reader has to scroll *back up* to — the problem the tabs were meant to fix.
   */
  sticky?: boolean;
  sx?: SxProps<Theme>;
};

/**
 * Hangs a count off a tab's glyph when there is one to show.
 *
 * `overlap="circular"` with a small badge keeps it inside the tab's own bounds
 * — a rectangular overlap pushes the number into the neighbouring label, which
 * on the scrollable mobile bar means it lands on top of whatever tab happens to
 * be beside it.
 */
function renderIcon<T extends string>(item: DetailTabItem<T>): ReactElement | undefined {
  if (!item.icon) return undefined;
  if (!item.badge) return item.icon;

  return (
    <Badge
      color="error"
      overlap="circular"
      badgeContent={item.badge}
      max={99}
      // The label already says what the tab is; the count needs saying too, and
      // a bare number read out after it is not a sentence.
      aria-label={`${item.badge} unread`}
      sx={{ '& .MuiBadge-badge': { fontSize: 10, minWidth: 16, height: 16 } }}
    >
      {item.icon}
    </Badge>
  );
}

/**
 * The section switcher for a detail page — one long stack of cards split into
 * tabs that each fit a screen.
 *
 * Values are the section *names* rather than indices, which is what lets them
 * go into the URL (see `useUrlTab`) and means inserting a section later cannot
 * silently re-point an existing link.
 *
 * Presentational only: the selected value is the caller's, so this is safe to
 * drive from a URL, from local state, or from a parent that syncs both.
 */
export function DetailTabs<T extends string>({
  items,
  value,
  onChange,
  idPrefix,
  ariaLabel,
  sticky = true,
  sx,
}: DetailTabsProps<T>) {
  return (
    <Box
      sx={[
        {
          mb: 3,
          borderBottom: 1,
          borderColor: 'divider',
          // Opaque in both modes: the panel scrolls underneath, and a
          // translucent bar would let the cards show through the labels.
          bgcolor: 'background.default',
          ...(sticky && {
            position: 'sticky',
            top: DETAIL_TABS_STICKY_TOP,
            // Under the top bar rather than over it, and under every dialog.
            zIndex: (theme: Theme) => theme.zIndex.appBar - 1,
          }),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Tabs
        value={value}
        onChange={(_, next: T) => onChange(next)}
        aria-label={ariaLabel}
        // Narrow screens are exactly where the tabs matter most, and four
        // labels do not fit one: they scroll rather than shrink to illegible.
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
      >
        {items.map((item) => (
          <Tab
            key={item.value}
            value={item.value}
            label={item.label}
            icon={renderIcon(item)}
            iconPosition="start"
            id={detailTabId(idPrefix, item.value)}
            aria-controls={detailPanelId(idPrefix, item.value)}
            sx={{ minHeight: 48, textTransform: 'none', fontWeight: 600 }}
          />
        ))}
      </Tabs>
    </Box>
  );
}

export type DetailTabPanelProps<T extends string> = {
  /** The section this panel holds. */
  value: T;
  /** The section currently showing. */
  active: T;
  /** Must match the `idPrefix` given to `<DetailTabs />`. */
  idPrefix: string;
  /**
   * Renders every panel and hides the inactive ones with CSS instead of
   * unmounting them.
   *
   * Off by default, and it should stay off inside the portals — see the note on
   * the component below. It exists for the one case where the DOM has a second
   * reader: a server-rendered public page that search engines index. There,
   * unmounting means the bio, the packages and the reviews never appear in the
   * HTML a crawler is served, and a vendor profile that ranks for none of its
   * own prices is a worse outcome than a slightly heavier page.
   *
   * Hidden via the `hidden` attribute rather than `display: none` in `sx`, so
   * the panel leaves the accessibility tree, tab order and find-in-page too —
   * an off-screen panel that a screen reader still walks through is exactly the
   * over-scrolling the tabs were meant to end.
   */
  keepMounted?: boolean;
  children: ReactNode;
};

/**
 * One section's content.
 *
 * An inactive panel is unmounted rather than hidden. Its cards own their own
 * reads, and React Query keeps the answers, so coming back is a cache hit —
 * whereas keeping four panels mounted means every card on the page subscribes,
 * re-renders and polls for a section nobody is looking at.
 *
 * `keepMounted` reverses that for a page whose HTML is read by something other
 * than the person looking at it. It is the right call on the public site, where
 * the panels are server-rendered static content with no subscriptions to leave
 * running, and the wrong one in a portal, where they are live queries.
 */
export function DetailTabPanel<T extends string>({
  value,
  active,
  idPrefix,
  keepMounted = false,
  children,
}: DetailTabPanelProps<T>) {
  const isActive = value === active;
  if (!isActive && !keepMounted) return null;

  return (
    <Box
      role="tabpanel"
      hidden={!isActive}
      id={detailPanelId(idPrefix, value)}
      aria-labelledby={detailTabId(idPrefix, value)}
    >
      {children}
    </Box>
  );
}
