import { Alert, Box, Divider, Drawer, IconButton, Stack, Typography } from '@sinnapi/ui';
import CloseIcon from '@mui/icons-material/Close';
import type { ServiceRegionModel } from '@/lib/types';
import type { RegionFormValues } from '../../schema';
import type { RegionDrawerMode } from '../../hooks/useRegionEdit';
import RegionForm from '../molecules/RegionForm';

type Props = {
  open: boolean;
  mode: RegionDrawerMode;
  /** The region being edited; null in create mode. */
  region: ServiceRegionModel | null;
  /** Suggested sort order for a new region — one past the current highest. */
  nextSortOrder: number;
  busy: boolean;
  /** Save failure, surfaced above the fields so it survives a scroll. */
  err: string | null;
  onClose: () => void;
  onSave: (values: RegionFormValues) => Promise<boolean>;
};

/**
 * Right-hand drawer for creating or editing a region. Owns the shell; the
 * form and the write live below it.
 *
 * `keepMounted={false}` (MUI's default) matters: unmounting on close discards
 * react-hook-form's state, so the next open — a different region, or a fresh
 * create — starts clean rather than inheriting the last one's edits.
 */
export default function RegionDrawer({
  open,
  mode,
  region,
  nextSortOrder,
  busy,
  err,
  onClose,
  onSave,
}: Props) {
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
            {isCreate ? 'New region' : 'Edit region'}
          </Typography>
          {!isCreate && region?.name && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {region.name}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} disabled={busy} aria-label="Close region drawer" edge="end">
          <CloseIcon />
        </IconButton>
      </Stack>
      <Divider />

      {err && (
        <Alert severity="error" sx={{ mx: 3, mt: 2 }}>
          {err}
        </Alert>
      )}

      <RegionForm
        region={region}
        isCreate={isCreate}
        nextSortOrder={nextSortOrder}
        busy={busy}
        onCancel={onClose}
        onSave={onSave}
      />
    </Drawer>
  );
}
