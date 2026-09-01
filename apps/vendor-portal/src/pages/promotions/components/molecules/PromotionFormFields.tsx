import { Divider, Stack } from '@sinnapi/ui';
import { ControlledField, ControlledDateRangeField } from '@sinnapi/ui/forms';
import type { Control } from 'react-hook-form';
import type { PackageModel, ServiceModel } from '@/lib/types';
import OfferTargetPicker from '@/components/offers/organisms/OfferTargetPicker';
import type { TargetKey } from '@/components/offers/schema/offerTargets';
import type { PromotionFormValues } from '../../schema';
import PromotionBannerField from './PromotionBannerField';

type Props = {
  control: Control<PromotionFormValues>;
  vendorId: string;
  packages: readonly PackageModel[];
  services: readonly ServiceModel[];
  selectedTargets: ReadonlySet<TargetKey>;
  onToggleTarget: (key: TargetKey) => void;
  onClearTargets: () => void;
  catalogueLoading?: boolean;
};

/**
 * What a campaign is made of, in the order a vendor writes it: what it is
 * called, what it says, what it looks like, and when it runs.
 *
 * Split from the form that submits it so the arrangement of the fields can
 * change without anyone re-reading how the write works — and so the same fields
 * back both creating a campaign and editing one.
 *
 * The banner binds itself to the form rather than being handed a value: its
 * content is produced by an upload, not typed, so the field owns the picking
 * and react-hook-form only ever sees the resulting URL.
 *
 * The scope picker comes LAST and behind a rule, because it is the only part of
 * this dialog that writes to another table. Everything above it describes the
 * campaign; below the rule is what the campaign is attached to — and a vendor
 * who has been told that distinction once by the layout does not have to be
 * told it again by a paragraph.
 */
export default function PromotionFormFields({
  control,
  vendorId,
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
        label="Title"
        autoFocus
        placeholder="Festive season offer"
      />
      <ControlledField
        name="description"
        control={control}
        label="Description"
        multiline
        minRows={3}
        placeholder="What the offer is, and what a client has to do to get it."
      />

      <PromotionBannerField vendorId={vendorId} control={control} />

      <ControlledField
        name="terms"
        control={control}
        label="Terms (optional)"
        multiline
        minRows={2}
        placeholder="New bookings only. Cannot be combined with other offers."
        helperText="Shown to clients under the saving. Conditions you do not state here you cannot enforce later."
      />

      {/* The run of the campaign, picked as one span — see DiscountForm. */}
      <ControlledDateRangeField
        fromName="starts_at"
        toName="ends_at"
        control={control}
        label="Runs between"
        placeholder="Select the campaign window"
        helperText="The dates this campaign is shown to clients, inclusive."
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
