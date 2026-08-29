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
  onSuccess: () => void;
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
    valueLabel,
    promotionOptions,
    submit,
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
          valueLabel={valueLabel}
          promotionOptions={promotionOptions}
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
