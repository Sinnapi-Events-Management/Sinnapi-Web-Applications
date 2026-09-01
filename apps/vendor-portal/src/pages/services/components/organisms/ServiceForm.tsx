import { Box, Button, DialogContent, DialogActions, Alert } from '@sinnapi/ui';
import { useServiceForm } from '../../hooks/useServiceForm';
import ServiceFormFields from '../molecules/ServiceFormFields';
import type { ServiceModel } from '@/lib/types';

type Props = {
  vendorId: string;
  /** The service being edited, or null for a new one. */
  service: ServiceModel | null;
  onCancel: () => void;
  onSuccess: () => void;
};

/**
 * The service form: its write, and the two buttons either side of it.
 *
 * The fields themselves are a sibling molecule, so this component is only ever
 * about submitting — which is what makes the field list editable without
 * touching the write, and the write auditable without scrolling past a
 * hundred lines of layout. Whether that write is an insert or an update is
 * `useServiceForm`'s business; from here the difference is one word on a
 * button.
 *
 * The save is disabled when the platform has no categories to file a NEW
 * service under. Letting the vendor fill the whole form in and then be refused
 * by a constraint is precisely the failure this screen exists to remove.
 */
export default function ServiceForm({ vendorId, service, onCancel, onSuccess }: Props) {
  const {
    control,
    error,
    busy,
    submit,
    isEdit,
    categoryOptions,
    categoriesLoading,
    hasNoCategories,
  } = useServiceForm(vendorId, service, onSuccess);

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <ServiceFormFields
          control={control}
          categoryOptions={categoryOptions}
          categoriesLoading={categoriesLoading}
          hasNoCategories={hasNoCategories}
        />
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          // Full-width stacked buttons on a phone, where a 44px target at the
          // edge of a dialog is the difference between saving and cancelling.
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          gap: { xs: 1, sm: 0 },
          '& > :not(style) ~ :not(style)': { ml: { xs: 0, sm: 1 } },
          '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } },
        }}
      >
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={busy || hasNoCategories}>
          {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add service'}
        </Button>
      </DialogActions>
    </Box>
  );
}
