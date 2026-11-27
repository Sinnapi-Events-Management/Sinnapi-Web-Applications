import { Chip, Stack } from '@sinnapi/ui';

/**
 * A row of chips for the usual answers; the exact field sits underneath.
 * Shared by the quotation builder and the package editor — the preset values
 * live with the schema (`ADVANCE_RATE_PRESETS`, `ADVANCE_DAY_PRESETS`).
 */
export default function PresetChips({
  values,
  current,
  format,
  onPick,
  label,
}: {
  values: number[];
  current: string;
  format: (n: number) => string;
  onPick: (n: number) => void;
  label: string;
}) {
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap aria-label={label}>
      {values.map((n) => {
        // `current.trim()` guards against '' reading as 0 and lighting up
        // "Nothing before" on an empty package field.
        const on = current.trim() !== '' && Number(current) === n;
        return (
          <Chip
            key={n}
            label={format(n)}
            clickable
            onClick={() => onPick(n)}
            color={on ? 'secondary' : 'default'}
            variant={on ? 'filled' : 'outlined'}
            sx={{ height: 40, fontWeight: on ? 700 : 500 }}
          />
        );
      })}
    </Stack>
  );
}
