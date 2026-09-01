import { Alert, Box, Button, DialogActions, DialogContent } from '@sinnapi/ui';
import type { PromotionModel } from '@/lib/types';
import { usePromotionForm } from '../../hooks/usePromotionForm';
import PromotionFormFields from '../molecules/PromotionFormFields';

type Props = {
  vendorId: string;
  /** The campaign being edited, or null when this is a new one. */
  promotion: PromotionModel | null;
  onCancel: () => void;
  /**
   * `warning` carries a scope write that failed after the campaign itself was
   * saved. The dialog still closes — the campaign exists — and the screen behind
   * reports it, which is where the campaign now is and where it can be fixed.
   */
  onSuccess: (warning?: string) => void;
};

/** The campaign fields and the write behind them, for both create and edit. */
export default function PromotionForm({ vendorId, promotion, onCancel, onSuccess }: Props) {
  const { control, error, busy, isEdit, submit, picker, packages, services, catalogueLoading } =
    usePromotionForm(vendorId, promotion, onSuccess);

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <PromotionFormFields
          control={control}
          vendorId={vendorId}
          packages={packages}
          services={services}
          selectedTargets={picker.selected}
          onToggleTarget={picker.toggle}
          onClearTargets={picker.clear}
          catalogueLoading={catalogueLoading}
        />
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
