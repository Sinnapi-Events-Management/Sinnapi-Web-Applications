import { Stack, Chip } from '@sinnapi/ui';
import { CONVERSATION_TYPE_FILTERS } from '../../schema';
import type { TypeFilter } from '../../hooks/useMessages';

type Props = {
  filter: TypeFilter;
};

/**
 * Multi-select chips narrowing the inbox by conversation type. Selecting none
 * means "all types", so there is no explicit all-chip — the clear affordance
 * only appears once a filter is on.
 */
export default function TypeFilterChips({ filter }: Props) {
  return (
    <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center">
      {CONVERSATION_TYPE_FILTERS.map((t) => {
        const selected = filter.isSelected(t.value);
        return (
          <Chip
            key={t.value}
            size="small"
            label={t.label}
            clickable
            onClick={() => filter.toggle(t.value)}
            color={selected ? 'primary' : 'default'}
            variant={selected ? 'filled' : 'outlined'}
            aria-pressed={selected}
            sx={{ fontWeight: selected ? 600 : 400 }}
          />
        );
      })}
      {filter.selected.length > 0 && (
        <Chip
          size="small"
          label="Clear types"
          variant="outlined"
          onDelete={filter.clear}
          onClick={filter.clear}
          sx={{ color: 'text.secondary' }}
        />
      )}
    </Stack>
  );
}
