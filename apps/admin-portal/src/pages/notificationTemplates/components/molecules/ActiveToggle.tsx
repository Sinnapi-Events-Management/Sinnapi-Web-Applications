import { Stack, Switch, Typography } from '@sinnapi/ui';

type Props = {
  checked: boolean;
  /** Disables the control and dims the label while the mutation is in flight. */
  busy?: boolean;
  onChange: (next: boolean) => void;
  /** Accessible label, e.g. the trigger key this toggle governs. */
  ariaLabel: string;
};

/**
 * Active-state cell: a switch paired with an "Active / Inactive" label so the
 * state is legible without decoding the switch position. Presentational — the
 * toggle mutation lives in the page hook.
 */
export default function ActiveToggle({ checked, busy, onChange, ariaLabel }: Props) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Switch
        checked={checked}
        disabled={busy}
        onChange={(_, next) => onChange(next)}
        inputProps={{ 'aria-label': ariaLabel }}
      />
      <Typography
        variant="body2"
        color={checked ? 'success.main' : 'text.disabled'}
        sx={{ fontWeight: 600, minWidth: 56 }}
      >
        {checked ? 'Active' : 'Inactive'}
      </Typography>
    </Stack>
  );
}
