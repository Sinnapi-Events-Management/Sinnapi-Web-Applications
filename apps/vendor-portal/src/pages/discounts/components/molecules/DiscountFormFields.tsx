import { Stack } from '@sinnapi/ui';
import { ControlledField, ControlledDateRangeField, type SelectOption } from '@sinnapi/ui/forms';
import type { Control } from 'react-hook-form';
import { DISCOUNT_TYPE_OPTIONS, type DiscountFormValues } from '../../schema';

type Props = {
  control: Control<DiscountFormValues>;
  /** True once clients have redeemed this code, which freezes the string. */
  codeLocked: boolean;
  /** True while the fixed-amount type is chosen, which changes two labels. */
  isFixed: boolean;
  valueLabel: string;
  promotionOptions: SelectOption[];
};

/**
 * What a discount is made of, in the order a vendor decides it: what clients
 * type, what it takes off, who qualifies, where it belongs, and when it runs.
 *
 * Split from the form that submits it so the arrangement of the fields can
 * change without anyone re-reading how the write works — and so the same fields
 * back both creating a code and editing one.
 *
 * The pairs share a row from `sm` up and stack below it. Type and value are one
 * decision read left to right — the type is what makes the value mean anything
 * — and the two limits are the same kind of thought. On a phone they stack,
 * because two number inputs side by side at 360px are two inputs nobody can
 * hit.
 *
 * The code field is disabled rather than hidden once a code has been redeemed,
 * so a vendor can still read what they published and can see *why* it cannot be
 * changed. Hiding it would read as the field having been removed.
 */
export default function DiscountFormFields({
  control,
  codeLocked,
  isFixed,
  valueLabel,
  promotionOptions,
}: Props) {
  return (
    <Stack spacing={2.5} sx={{ mt: 1 }}>
      <ControlledField
        name="code"
        control={control}
        label="Code (optional)"
        autoFocus={!codeLocked}
        disabled={codeLocked}
        placeholder="EARLY-BIRD"
        helperText={
          codeLocked
            ? 'Clients have already redeemed this code, so it can no longer be changed. Everything else here can.'
            : 'Leave blank for an automatic discount that needs no code.'
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
        <ControlledField
          name="type"
          control={control}
          label="Type"
          options={DISCOUNT_TYPE_OPTIONS}
          sx={{ flex: 1, width: '100%' }}
        />
        <ControlledField
          name="value"
          control={control}
          type="number"
          label={valueLabel}
          sx={{ flex: 1, width: '100%' }}
          inputProps={{ min: 0, inputMode: 'decimal' }}
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
        <ControlledField
          name="max_uses"
          control={control}
          type="number"
          label="Max uses (optional)"
          sx={{ flex: 1, width: '100%' }}
          inputProps={{ min: 1, inputMode: 'numeric' }}
          helperText="Blank means unlimited."
        />
        <ControlledField
          name="min_amount"
          control={control}
          type="number"
          label="Minimum booking (optional)"
          sx={{ flex: 1, width: '100%' }}
          inputProps={{ min: 0, inputMode: 'decimal' }}
          helperText={
            isFixed
              ? 'Must be more than the amount taken off.'
              : 'Only bookings at or above this qualify.'
          }
        />
      </Stack>

      <ControlledField
        name="promotion_id"
        control={control}
        label="Campaign"
        options={promotionOptions}
        helperText="Attach the code to a campaign and its redemptions count towards that campaign's return."
      />

      {/* One control for what is one decision: the window the code is live.
          The calendar constrains the end to the start, so the schema's
          "end on or after start" rule is a backstop rather than a message
          vendors routinely see. */}
      <ControlledDateRangeField
        fromName="starts_at"
        toName="ends_at"
        control={control}
        label="Valid between"
        placeholder="Select the discount window"
        helperText="The dates this code can be redeemed, inclusive."
      />
    </Stack>
  );
}
