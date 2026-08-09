import { Box, Button, DialogContent, DialogActions, Alert, Stack } from '@sinnapi/ui';
import { ControlledField, ControlledDateRangeField } from '@sinnapi/ui/forms';
import { DISCOUNT_TYPE_OPTIONS } from '../../schema';
import { useDiscountForm } from '../../hooks/useDiscountForm';

type Props = {
  vendorId: string;
  onCancel: () => void;
  onSuccess: () => void;
};

/** The new-discount fields and their write. */
export default function DiscountForm({ vendorId, onCancel, onSuccess }: Props) {
  const { control, error, busy, valueLabel, submit } = useDiscountForm(vendorId, onSuccess);

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <ControlledField
            name="code"
            control={control}
            label="Code (optional)"
            helperText="Leave blank for an automatic discount with no code."
            autoFocus
          />
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <ControlledField
              name="type"
              control={control}
              label="Type"
              options={DISCOUNT_TYPE_OPTIONS}
              sx={{ flex: 1 }}
            />
            <ControlledField
              name="value"
              control={control}
              type="number"
              label={valueLabel}
              sx={{ flex: 1 }}
              inputProps={{ min: 0 }}
            />
          </Stack>
          <ControlledField
            name="max_uses"
            control={control}
            type="number"
            label="Max uses (optional)"
            inputProps={{ min: 1 }}
          />
          {/* One control for what is one decision: the window the code is live.
              The calendar constrains the end to the start, so the schema's
              "end on or after start" rule is now a backstop rather than a
              message vendors routinely see. */}
          <ControlledDateRangeField
            fromName="starts_at"
            toName="ends_at"
            control={control}
            label="Valid between"
            placeholder="Select the discount window"
            helperText="The dates this code can be redeemed, inclusive."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={busy}>
          {busy ? 'Saving…' : 'Create'}
        </Button>
      </DialogActions>
    </Box>
  );
}
