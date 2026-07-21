import { Stack, Chip } from '@sinnapi/ui';
import { DOMAIN_FILTERS } from '../../schema';
import type { DomainFilter } from '../../hooks/useNotifications';

type Props = {
  filter: DomainFilter;
  /** Domain keys actually present in the loaded feed; others are hidden. */
  available: Set<string>;
};

/**
 * Multi-select chips narrowing the feed by domain. Selecting none means "all
 * domains", so there is no explicit all-chip — the clear affordance only appears
 * once a filter is on.
 *
 * Only domains that actually occur in the loaded feed are offered: the full
 * table is fifteen entries, and showing chips that can only ever return nothing
 * turns the filter row into noise.
 */
export default function DomainFilterChips({ filter, available }: Props) {
  const options = DOMAIN_FILTERS.filter((d) => available.has(d.key) || filter.isSelected(d.key));

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
