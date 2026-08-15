import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  IconBadge,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@sinnapi/ui';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { lifecycleSpec, SUSPENSION_PRESETS, type LifecycleAction } from '../../schema/actions';
import { useLifecycleForm } from '../../hooks/useLifecycleForm';
import type { LifecycleSubmission, PendingLifecycle } from '../../hooks/useVendorLifecycle';

type Props = {
  pending: PendingLifecycle | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (submission: LifecycleSubmission) => void;
};

const ICONS: Record<LifecycleAction, React.ReactNode> = {
  suspend: <PauseCircleOutlineIcon />,
  deactivate: <PowerSettingsNewIcon />,
  block: <BlockIcon />,
  activate: <CheckCircleOutlineIcon />,
};

/**
 * One dialog for all four lifecycle transitions. Everything that differs —
 * heading, consequence copy, button label, colour, whether a reason and an end
 * date are required — comes from the action spec, so a fifth transition is a
 * new entry in `schema/actions.ts` and nothing here.
 *
 * `ConfirmDialog` was not reused despite the overlap: a suspension needs a
 * duration control, and pushing that into the shared component would give every
 * other confirmation in the console a field it has no use for.
 *
 * Presentation only. The form's rules live in `useLifecycleForm`; the action and
 * its in-flight state belong to `useVendorLifecycle`.
 */
export default function VendorLifecycleDialog({ pending, busy, onCancel, onConfirm }: Props) {
  const spec = pending ? lifecycleSpec(pending.action) : null;
  const form = useLifecycleForm(spec, pending ? `${pending.profileId}:${pending.action}` : null);
  const name = pending?.name ?? 'this vendor';

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.canSubmit) return;
    onConfirm(form.submission());
  }

  return (
    <Dialog
      open={!!pending}
      // Blocked while the action is in flight: dismissing mid-request would
      // leave the operator unsure whether it landed.
      onClose={busy ? undefined : onCancel}
      fullWidth
      maxWidth="xs"
      PaperProps={{ component: 'form', onSubmit: handleSubmit, sx: { borderRadius: 4 } }}
    >
      <DialogContent sx={{ px: { xs: 3, sm: 4 }, pt: 4, pb: 2, textAlign: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <IconBadge accent={spec?.tone ?? 'secondary'} size={64} circular>
            {pending ? ICONS[pending.action] : null}
          </IconBadge>
          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
            {spec?.title(name)}
          </Typography>
          <DialogContentText sx={{ color: 'text.secondary', m: 0 }}>
            {spec?.description(name)}
          </DialogContentText>
        </Stack>

        {spec?.requiresUntil && (
          <Stack spacing={2} sx={{ mt: 3, textAlign: 'left' }}>
            <TextField
              select
              label="Suspend for"
              value={String(form.presetDays ?? 'custom')}
              onChange={(e) =>
                form.setPresetDays(e.target.value === 'custom' ? null : Number(e.target.value))
              }
              disabled={busy}
              fullWidth
            >
              {SUSPENSION_PRESETS.map((preset) => (
                <MenuItem key={preset.label} value={String(preset.days ?? 'custom')}>
                  {preset.label}
                </MenuItem>
              ))}
            </TextField>

            {form.isCustom && (
              <TextField
                type="date"
                label="Suspended until"
                value={form.customDate}
                onChange={(e) => form.setCustomDate(e.target.value)}
                inputProps={{ min: form.minCustomDate }}
                InputLabelProps={{ shrink: true }}
                disabled={busy}
                required
                fullWidth
                helperText="The suspension lifts on its own at the end of this day."
              />
            )}
          </Stack>
        )}

        {spec?.requiresReason && (
          <TextField
            label="Reason"
            value={form.reason}
            onChange={(e) => form.setReason(e.target.value)}
            multiline
            minRows={3}
            required
            fullWidth
            disabled={busy}
            sx={{ mt: 2, textAlign: 'left' }}
            helperText="Recorded on the account and in the audit log. Never shown to the vendor."
          />
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 3, sm: 4 },
          pb: 3,
          pt: 1,
          gap: 1.5,
          flexDirection: { xs: 'column-reverse', sm: 'row' },
        }}
      >
        <Button
          fullWidth
          variant="outlined"
          color="error"
          onClick={onCancel}
          disabled={busy}
          sx={{ m: 0 }}
        >
          Cancel
        </Button>
        <Button
          fullWidth
          type="submit"
          color={spec?.tone ?? 'secondary'}
          variant="contained"
          disableElevation
          disabled={busy || !form.canSubmit}
          startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
          sx={{ m: 0 }}
        >
          {spec?.confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
