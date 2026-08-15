'use client';
import { Stack, Chip } from '@mui/material';
import { NOTIFICATION_DOMAINS } from '../schema/domains';
import type { NotificationDomainFilter } from '../hooks/useNotificationFeed';

export type DomainFilterChipsProps = {
  filter: NotificationDomainFilter;
  /** Domain keys actually present in the loaded feed; others are hidden. */
  available: Set<string>;
};

/**
 * Multi-select chips narrowing the feed by domain. Selecting none means "all
 * domains", so there is no explicit all-chip — the clear affordance only appears
 * once a filter is on.
 *
 * Only domains that actually occur are offered: the full table runs to a dozen
 * entries, and chips that can only ever return nothing turn the filter row into
 * noise. A currently-selected chip stays visible even after its last row leaves
 * the feed, so the filter can always be undone.
 */
export function DomainFilterChips({ filter, available }: DomainFilterChipsProps) {
  const options = NOTIFICATION_DOMAINS.filter(
    (d) => available.has(d.key) || filter.isSelected(d.key),
  );

  // One chip filters nothing — it either matches everything or hides everything.
  if (options.length < 2) return null;

  return (
    <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center">
      {options.map((d) => {
        const selected = filter.isSelected(d.key);
        return (
          <Chip
            key={d.key}
            size="small"
            label={d.label}
            clickable
            onClick={() => filter.toggle(d.key)}
            color={selected ? d.accent : 'default'}
            variant={selected ? 'filled' : 'outlined'}
            aria-pressed={selected}
            sx={{ fontWeight: selected ? 600 : 400 }}
          />
        );
      })}
      {filter.selected.length > 0 && (
        <Chip
          size="small"
          label="Clear"
          variant="outlined"
          onDelete={filter.clear}
          onClick={filter.clear}
          sx={{ color: 'text.secondary' }}
        />
      )}
    </Stack>
  );
}
