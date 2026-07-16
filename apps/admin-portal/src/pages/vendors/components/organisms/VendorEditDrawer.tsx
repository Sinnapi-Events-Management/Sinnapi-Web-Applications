import { useRef } from 'react';
import { Alert, Box, Divider, Drawer, IconButton, Skeleton, Stack, Typography } from '@sinnapi/ui';
import CloseIcon from '@mui/icons-material/Close';
import type { VendorDetailModel } from '@/lib/types';
import type { VendorEditValues } from '../../schema';
import VendorEditForm from '../molecules/VendorEditForm';

type Props = {
  open: boolean;
  /** The full record behind the form; null while it loads. */
  vendor: VendorDetailModel | null;
  loading: boolean;
  loadError: string | null;
  busy: boolean;
  /** Save failure, surfaced above the fields so it survives a scroll. */
  err: string | null;
  onClose: () => void;
  onSave: (values: VendorEditValues) => Promise<boolean>;
};

function FormSkeleton() {
  return (
    <Stack spacing={2.5} sx={{ px: 3, py: 2.5 }}>
      {[56, 56, 120, 56, 56, 56].map((h, i) => (
        <Skeleton key={i} variant="rounded" height={h} />
      ))}
    </Stack>
  );
}

/**
 * Right-hand drawer for editing a vendor. Owns the shell and the load states;
 * the form and the write live below it.
 *
 * `keepMounted={false}` (MUI's default) matters here — unmounting on close
 * discards react-hook-form's state, so the next vendor opens clean rather than
 * inheriting the last one's edits.
 */
export default function VendorEditDrawer({
  open,
  vendor,
  loading,
  loadError,
  busy,
  err,
  onClose,
  onSave,
}: Props) {
  // Closing clears the record immediately, but the drawer keeps rendering for the
  // length of its slide-out. Painting the last vendor through that window stops
  // the form collapsing into skeletons on the way out. Only used while closing —
  // reopening a different vendor must show its own loading state, not this one.
  const lastVendor = useRef<VendorDetailModel | null>(null);
  if (vendor) lastVendor.current = vendor;
  const shown = open ? vendor : lastVendor.current;

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
            Edit vendor
          </Typography>
          {shown?.business_name && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {shown.business_name}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} disabled={busy} aria-label="Close edit drawer" edge="end">
          <CloseIcon />
        </IconButton>
      </Stack>
      <Divider />

      {err && (
        <Alert severity="error" sx={{ mx: 3, mt: 2 }}>
          {err}
        </Alert>
      )}

      {loadError ? (
        <Alert severity="error" sx={{ m: 3 }}>
          {loadError}
        </Alert>
      ) : loading || !shown ? (
        <FormSkeleton />
      ) : (
        <VendorEditForm vendor={shown} busy={busy} onCancel={onClose} onSave={onSave} />
      )}
    </Drawer>
  );
}
