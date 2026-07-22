import { Chip, Stack } from '@sinnapi/ui/atoms';

/**
 * How many category chips fit on a card before the row starts competing with
 * the name and price for attention. The rest collapse into a single "+N".
 */
const MAX_VISIBLE = 2;

/**
 * Compact, single-line summary of what a vendor sells. Renders nothing when the
 * vendor has no categories, so callers can pass the array through unguarded.
 */
export default function CategoryChips({ categories }: { categories: string[] }) {
  if (categories.length === 0) return null;

  const visible = categories.slice(0, MAX_VISIBLE);
  const overflow = categories.length - visible.length;

  return (
    <Stack direction="row" spacing={0.5} sx={{ mt: 1, overflow: 'hidden' }}>
      {visible.map((category) => (
        <Chip
          key={category}
          size="small"
          variant="outlined"
          label={category}
          sx={{ maxWidth: 140, fontWeight: 500 }}
        />
      ))}
      {overflow > 0 && (
        <Chip
          size="small"
          variant="outlined"
          label={`+${overflow}`}
          aria-label={`${overflow} more categories`}
          sx={{ fontWeight: 500 }}
        />
      )}
    </Stack>
  );
}
