'use client';
import { Stack, Box, Typography } from '@mui/material';
import { SearchField } from '../../molecules/SearchField';
import { DomainFilterChips } from '../molecules/DomainFilterChips';
import { DesktopAlertsToggle } from '../molecules/DesktopAlertsToggle';
import type {
  NotificationDomainFilter,
  NotificationSearchState,
} from '../hooks/useNotificationFeed';
import type { DesktopNotifications } from '../hooks/useDesktopNotifications';

export type NotificationsToolbarProps = {
  search: NotificationSearchState;
  domainFilter: NotificationDomainFilter;
  /** Domain keys present in the loaded feed. */
  availableDomains: Set<string>;
  /** Rows currently visible, after tab + domain + search. */
  resultCount: number;
  /** Omit to hide the desktop-alerts opt-in entirely. */
  alerts?: DesktopNotifications;
};

/**
 * Search, domain chips, the desktop-alerts opt-in and the result count.
 * Presentational: every piece of filter state is owned by the caller's hook.
 *
 * The search input takes its own row and fills the column — the master pane is
 * only ~440px wide, so pairing it with a nowrap count on one line leaves neither
 * enough room. The count rides with the chips, where it can wrap.
 */
export function NotificationsToolbar({
  search,
  domainFilter,
  availableDomains,
  resultCount,
  alerts,
}: NotificationsToolbarProps) {
  return (
    <Stack spacing={1.25}>
      <SearchField
        value={search.input}
        onChange={search.setInput}
        onClear={search.clear}
        placeholder="Search notifications…"
        ariaLabel="Search notifications"
        size="small"
      />
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ flexWrap: 'wrap', rowGap: 0.75 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <DomainFilterChips filter={domainFilter} available={availableDomains} />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {resultCount} shown
        </Typography>
      </Stack>
      {alerts && (
        <Box>
          <DesktopAlertsToggle alerts={alerts} />
        </Box>
      )}
    </Stack>
  );
}
