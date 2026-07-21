import { Stack, Chip } from '@sinnapi/ui';
import { GRANT_FILTERS, type GrantFilter } from '../../schema';

type Props = {
  value: GrantFilter;
  onChange: (next: GrantFilter) => void;
};

/**
 * Single-select chips narrowing the catalog to granted / not-granted rows.
 * Single-select because the three options partition the catalog — "granted" and
 * "not granted" together are just "all", so a multi-select row would offer a
 * combination that means nothing.
 */
export default function GrantFilterChips({ value, onChange }: Props) {
  return (
    <Stack direction="row" flexWrap="wrap" gap={0.75} role="group" aria-label="Filter permissions">
      {GRANT_FILTERS.map((option) => {
        const selected = option.value === value;
        return (
          <Chip
            key={option.value}
            size="small"
            label={option.label}
            clickable
            onClick={() => onChange(option.value)}
            color={selected ? 'secondary' : 'default'}
            variant={selected ? 'filled' : 'outlined'}
            aria-pressed={selected}
            sx={{ fontWeight: selected ? 600 : 400 }}
          />
        );
      })}
    </Stack>
  );
}
