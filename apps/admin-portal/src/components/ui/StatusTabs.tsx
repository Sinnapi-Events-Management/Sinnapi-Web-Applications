import { Box, Chip, Tab, Tabs, Skeleton } from '@sinnapi/ui';

export type StatusTabOption<V extends string = string> = {
  value: V;
  label: string;
  /** Row count badge. Omit to render the tab without one. */
  count?: number;
};

type StatusTabsProps<V extends string> = {
  options: StatusTabOption<V>[];
  value: V;
  onChange: (next: V) => void;
  /** Shows badge placeholders while the counts query is in flight. */
  loadingCounts?: boolean;
  /** Describes the tab set for screen readers, e.g. "Filter applications by status". */
  ariaLabel: string;
};

function CountBadge({ count, loading }: { count?: number; loading?: boolean }) {
  if (loading) return <Skeleton variant="rounded" width={22} height={20} />;
  if (count === undefined) return null;
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
 * Status filter tabs for a list view, each with an optional row-count badge.
 * Presentational only — the selected value and counts are owned by the caller's
 * hook, so this stays reusable across admin queues.
 */
export default function StatusTabs<V extends string>({
  options,
  value,
  onChange,
  loadingCounts,
  ariaLabel,
}: StatusTabsProps<V>) {
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <Tabs
        value={value}
        onChange={(_, next: V) => onChange(next)}
        aria-label={ariaLabel}
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
