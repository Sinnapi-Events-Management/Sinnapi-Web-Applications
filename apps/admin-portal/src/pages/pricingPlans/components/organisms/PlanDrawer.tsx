import { Alert, Box, Divider, Drawer, IconButton, Stack, Typography } from '@sinnapi/ui';
import CloseIcon from '@mui/icons-material/Close';
import type { PlanModel } from '@/lib/types';
import type { PlanFormValues } from '../../schema';
import type { PlanDrawerMode } from '../../hooks/usePlanEdit';
import PlanForm from '../molecules/PlanForm';

type Props = {
  open: boolean;
  mode: PlanDrawerMode;
  /** The plan being edited; null in create mode. */
  plan: PlanModel | null;
  busy: boolean;
  /** Save failure, surfaced above the fields so it survives a scroll. */
  err: string | null;
  onClose: () => void;
  onSave: (values: PlanFormValues) => Promise<boolean>;
};

/**
 * Right-hand drawer for creating or editing a plan. Owns the shell; the form
 * and the write live below it.
 *
 * `keepMounted={false}` (MUI's default) matters: unmounting on close discards
 * react-hook-form's state, so the next open — a different plan, or a fresh
 * create — starts clean rather than inheriting the last one's edits.
 */
export default function PlanDrawer({ open, mode, plan, busy, err, onClose, onSave }: Props) {
  const isCreate = mode === 'create';

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={busy ? undefined : onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 480 },
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 3, py: 2 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight={600} noWrap>
            {isCreate ? 'New plan' : 'Edit plan'}
          </Typography>
          {!isCreate && plan?.name && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {plan.name}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} disabled={busy} aria-label="Close plan drawer" edge="end">
          <CloseIcon />
        </IconButton>
      </Stack>
      <Divider />

      {err && (
        <Alert severity="error" sx={{ mx: 3, mt: 2 }}>
          {err}
        </Alert>
      )}

      <PlanForm plan={plan} isCreate={isCreate} busy={busy} onCancel={onClose} onSave={onSave} />
    </Drawer>
  );
}
