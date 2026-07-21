import { Box, Typography } from '@sinnapi/ui';
import InfoRow from '@/components/ui/InfoRow';
import { titleize } from '@/lib/config';

type Props = {
  data: Record<string, unknown> | null;
};

/** Scalars render inline; anything structured falls back to compact JSON. */
function display(value: unknown): { text: string; mono: boolean } {
  if (value === null || value === undefined) return { text: '—', mono: false };
  if (typeof value === 'string') return { text: value, mono: isIdLike(value) };
  if (typeof value === 'number' || typeof value === 'boolean') {
    return { text: String(value), mono: false };
  }
  if (Array.isArray(value)) {
    // A summary beats an unreadable wall — reconciliation alerts ship a
    // `mismatches` array that can run to dozens of entries.
    return { text: `${value.length} item${value.length === 1 ? '' : 's'}`, mono: false };
  }
  return { text: JSON.stringify(value), mono: true };
}

function isIdLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * The notification's `data` payload as labelled rows.
 *
 * Rendered generically on purpose: the three producers each write a different
 * shape — `{dispute_id}`, `{aggregate,id}` and `{mismatches}` — so probing keys
 * one by one would silently drop whatever a fourth writer adds. Ids get a copy
 * affordance, since pasting one into a search box is the usual next step.
 */
export default function PayloadPanel({ data }: Props) {
  const entries = Object.entries(data ?? {});
  if (entries.length === 0) return null;

  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.5px' }}>
        Context
      </Typography>
      <Box sx={{ mt: 0.5 }}>
        {entries.map(([key, value]) => {
          const { text, mono } = display(value);
          return (
            <InfoRow
              key={key}
              label={titleize(key)}
              value={text}
              mono={mono}
              copyValue={mono && text !== '—' ? text : undefined}
            />
          );
        })}
      </Box>
    </Box>
  );
}
