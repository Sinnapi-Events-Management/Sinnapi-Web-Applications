import { Alert, Box, Button, DialogActions, DialogContent } from '@sinnapi/ui';
import type { PromotionModel } from '@/lib/types';
import { usePromotionForm } from '../../hooks/usePromotionForm';
import PromotionFormFields from '../molecules/PromotionFormFields';

type Props = {
  vendorId: string;
  /** The campaign being edited, or null when this is a new one. */
  promotion: PromotionModel | null;
  onCancel: () => void;
  onSuccess: () => void;
};

/** The campaign fields and the write behind them, for both create and edit. */
export default function PromotionForm({ vendorId, promotion, onCancel, onSuccess }: Props) {
  const { control, error, busy, isEdit, submit } = usePromotionForm(vendorId, promotion, onSuccess);

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <PromotionFormFields control={control} vendorId={vendorId} />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel} disabled={busy} color="inherit">
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={busy}>
          {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create campaign'}
        </Button>
      </DialogActions>
    </Box>
  );
}
