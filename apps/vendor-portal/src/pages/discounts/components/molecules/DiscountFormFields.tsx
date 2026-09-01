import { Divider, Stack } from '@sinnapi/ui';
import {
  ControlledField,
  ControlledDateRangeField,
  ControlledSwitch,
  type SelectOption,
} from '@sinnapi/ui/forms';
import type { Control } from 'react-hook-form';
import type { PackageModel, ServiceModel } from '@/lib/types';
import OfferTargetPicker from '@/components/offers/organisms/OfferTargetPicker';
import type { TargetKey } from '@/components/offers/schema/offerTargets';
import { DISCOUNT_TYPE_OPTIONS, type DiscountFormValues } from '../../schema';

type Props = {
  control: Control<DiscountFormValues>;
  /** True once clients have redeemed this code, which freezes the string. */
  codeLocked: boolean;
  /** True while the fixed-amount type is chosen, which changes three labels. */
  isFixed: boolean;
  /** True while the code applies without being typed, which frees the code field. */
  isAutomatic: boolean;
  valueLabel: string;
  promotionOptions: SelectOption[];
  packages: readonly PackageModel[];
  services: readonly ServiceModel[];
  selectedTargets: ReadonlySet<TargetKey>;
  onToggleTarget: (key: TargetKey) => void;
  onClearTargets: () => void;
  catalogueLoading?: boolean;
};

/**
 * What a discount is made of, in the order a vendor decides it: what clients
 * see it called, what it takes off, who qualifies, where it belongs, when it
 * runs, and what it covers.
 *
 * Split from the form that submits it so the arrangement of the fields can
 * change without anyone re-reading how the write works — and so the same fields
 * back both creating a code and editing one.
 *
 * THE NAME COMES BEFORE THE CODE, WHICH IS A REVERSAL
 * This screen used to open on the code field, because the code was all a
 * discount had. It is now the second thing: `title` is what a client reads on a
 * package card, and a vendor who names the offer first writes a better one than
 * a vendor who starts by inventing a token.
 *
 * The pairs share a row from `sm` up and stack below it. Type and value are one
 * decision read left to right — the type is what makes the value mean anything
 * — and each pair of limits is the same kind of thought. On a phone they stack,
 * because two number inputs side by side at 360px are two inputs nobody can hit.
 *
 * The code field is disabled rather than hidden once a code has been redeemed,
 * so a vendor can still read what they published and can see *why* it cannot be
 * changed. Hiding it would read as the field having been removed.
 */
export default function DiscountFormFields({
  control,
  codeLocked,
  isFixed,
  isAutomatic,
  valueLabel,
  promotionOptions,
  packages,
  services,
  selectedTargets,
  onToggleTarget,
  onClearTargets,
  catalogueLoading,
}: Props) {
  return (
    <Stack spacing={2.5} sx={{ mt: 1 }}>
      <ControlledField
        name="title"
        control={control}
        label="Offer name"
        autoFocus
        placeholder="Early-bird 20% off"
        helperText="What clients see on the package card. Not the code."
      />

      <ControlledField
        name="description"
        control={control}
        label="Description (optional)"
        multiline
        minRows={2}
        placeholder="Book before the end of the month and save on any Gold-tier wedding package."
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

      <ControlledField
        name="code"
        control={control}
        label={isAutomatic ? 'Code (optional)' : 'Code'}
        disabled={codeLocked}
        placeholder="EARLY-BIRD"
        helperText={
          codeLocked
            ? 'Clients have already redeemed this code, so it can no longer be changed. Everything else here can.'
            : isAutomatic
              ? 'Optional while the offer applies automatically — add one if you also want it on a poster.'
              : 'What a client types to claim this offer.'
        }
      />

      {/* Under the code, because it changes what the code field means. A vendor
          reading top to bottom meets the token first and then the switch that
          says whether anyone has to type it. */}
      <ControlledSwitch
        name="is_automatic"
        control={control}
        label="Apply automatically"
        helperText="Clients see the reduced price on the package card without entering anything."
      />

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
          name="max_per_client"
          control={control}
          type="number"
          label="Per client (optional)"
          sx={{ flex: 1, width: '100%' }}
          inputProps={{ min: 1, inputMode: 'numeric' }}
          helperText="Stops one client using the whole campaign."
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
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
        {/* A ceiling belongs to a percentage: on a fixed amount the value IS
            the ceiling. Disabled rather than hidden so the pair keeps its
            layout and the vendor can see the field exists and why it does not
            apply to what they have chosen. */}
        <ControlledField
          name="max_discount_amount"
          control={control}
          type="number"
          label="Maximum discount (optional)"
          disabled={isFixed}
          sx={{ flex: 1, width: '100%' }}
          inputProps={{ min: 0, inputMode: 'decimal' }}
          helperText={
            isFixed
              ? 'A fixed amount is already its own maximum.'
              : 'Caps what a percentage can take off a large booking.'
          }
        />
      </Stack>

      <ControlledField
        name="promotion_id"
        control={control}
        label="Campaign"
        options={promotionOptions}
        helperText="Attach the code to a campaign and its redemptions count towards that campaign's return. Leave the scope below empty and the code covers whatever the campaign does."
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

      <Divider />

      <OfferTargetPicker
        packages={packages}
        services={services}
        selected={selectedTargets}
        onToggle={onToggleTarget}
        onClear={onClearTargets}
        isLoading={catalogueLoading}
      />
    </Stack>
  );
}
