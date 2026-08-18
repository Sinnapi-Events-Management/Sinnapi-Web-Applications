'use client';
import { Box, Chip, Tab, Tabs, Skeleton } from '@mui/material';
import type { NotificationTabOption } from '../schema/tabs';
import type { NotificationTab } from '../types';

export type NotificationTabsProps = {
  options: NotificationTabOption[];
  value: NotificationTab;
  onChange: (next: NotificationTab) => void;
  /** Shows badge placeholders while the counts query is in flight. */
  loadingCounts?: boolean;
};

function CountBadge({ count, loading }: { count: number; loading?: boolean }) {
  if (loading) return <Skeleton variant="rounded" width={22} height={20} />;
  return (
    <Chip
      label={count}
      size="small"
      sx={{
        height: 20,
        fontSize: 11,
        fontWeight: 600,
        // Inherit the tab's colour so the badge tracks selected/unselected.
        color: 'inherit',
        bgcolor: 'action.selected',
        '& .MuiChip-label': { px: 0.75 },
      }}
    />
  );
}

/**
 * Read-state tabs with row-count badges — All / Unread / Read.
 *
 * Separating unread from the full history is the split that matters in a
 * notification centre: "what still needs me" and "what happened" are different
 * questions, and answering both from one undifferentiated list is why feeds get
 * abandoned. Presentational — the selected value and the counts are owned by
 * the caller's hook.
 */
export function NotificationTabs({
  options,
  value,
  onChange,
  loadingCounts,
}: NotificationTabsProps) {
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <Tabs
        value={value}
        onChange={(_, next: NotificationTab) => onChange(next)}
        aria-label="Filter notifications by read state"
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
      >
        {options.map((option) => (
          <Tab
            key={option.value}
            value={option.value}
            sx={{ minHeight: 48, textTransform: 'none', fontWeight: 600 }}
            label={
              <Box
                component="span"
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
              >
                {option.label}
                <CountBadge count={option.count} loading={loadingCounts} />
              </Box>
            }
          />
        ))}
      </Tabs>
    </Box>
  );
}
