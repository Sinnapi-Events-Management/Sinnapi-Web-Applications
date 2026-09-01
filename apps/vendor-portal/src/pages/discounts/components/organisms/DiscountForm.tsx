import { Alert, Box, Button, DialogActions, DialogContent } from '@sinnapi/ui';
import type { PromotionModel } from '@/lib/types';
import { useDiscountForm } from '../../hooks/useDiscountForm';
import DiscountFormFields from '../molecules/DiscountFormFields';
import type { DiscountRow } from '../../schema';

type Props = {
  vendorId: string;
  /** The code being edited, or null when this is a new one. */
  discount: DiscountRow | null;
  promotions: PromotionModel[];
  onCancel: () => void;
  /**
   * `warning` carries a scope write that failed after the code itself was
   * saved. The dialog still closes — the code exists, and re-submitting would
   * hit the unique index — and the screen behind reports it.
   */
  onSuccess: (warning?: string) => void;
};

/** The discount fields and the write behind them, for both create and edit. */
export default function DiscountForm({
  vendorId,
  discount,
  promotions,
  onCancel,
  onSuccess,
}: Props) {
  const {
    control,
    error,
    busy,
    isEdit,
    codeLocked,
    isFixed,
    isAutomatic,
    valueLabel,
    promotionOptions,
    submit,
    picker,
    packages,
    services,
    catalogueLoading,
  } = useDiscountForm(vendorId, discount, promotions, onSuccess);

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DiscountFormFields
          control={control}
          codeLocked={codeLocked}
          isFixed={isFixed}
          isAutomatic={isAutomatic}
          valueLabel={valueLabel}
          promotionOptions={promotionOptions}
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
          {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create discount'}
        </Button>
      </DialogActions>
    </Box>
  );
}
