import { useEffect, useMemo } from 'react';
import { useWatch, type Control } from 'react-hook-form';
import { allowedPricingModels, pricingModelSpec } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import type { ServiceModel } from '@/lib/types';
import type { PackageFormValues } from '../../schema';

type Props = {
  control: Control<PackageFormValues>;
  services: ServiceModel[];
  setPricingModel: (value: string) => void;
};

/**
 * How this package is charged — one model, drawn from what its service offers.
 *
 * A SERVICE declares a SET of models ("I take fixed-price weddings and hourly
 * corporate work"); a PACKAGE declares ONE of them, because a package is a
 * single offer and a client picks between cards rather than configuring one.
 *
 * The options narrow to the linked service's set, which is the same rule
 * `save_quote_package` enforces. Offering a model the server will refuse is
 * the worst kind of form — one that presents a choice and then takes it back
 * on save — so the two lists are derived from one function,
 * `allowedPricingModels`, rather than written twice.
 *
 * A package with no linked service, or one whose service has not stated its
 * models (every service predating 0823c), gets the full list. That is the
 * RPC's behaviour too: an empty set means "not stated", not "nothing allowed".
 */
export default function PackagePricingModelField({ control, services, setPricingModel }: Props) {
  const serviceId = useWatch({ control, name: 'vendor_service_id' });
  const model = useWatch({ control, name: 'pricing_model' });

  const service = services.find((entry) => entry.id === serviceId) ?? null;
  // Memoised on the service's own set rather than on `service`: the array is a
  // dependency of the effect below, and a fresh one each render would re-run
  // it on every keystroke elsewhere in the editor.
  const allowed = useMemo(
    () => allowedPricingModels(service?.pricing_models),
    [service?.pricing_models],
  );

  // Switching the service can strip the chosen model out from under the
  // vendor. Clearing it here — rather than leaving a value the select cannot
  // display — turns a silently blank field into a required one they are asked
  // to answer again.
  useEffect(() => {
    if (model && !allowed.some((entry) => entry === model)) setPricingModel('');
  }, [allowed, model, setPricingModel]);

  return (
    <ControlledField
      name="pricing_model"
      control={control}
      label="How this package is charged"
      options={allowed.map((entry) => ({
        value: entry,
        label: pricingModelSpec(entry).label,
      }))}
      helperText={
        service && allowed.length < 4
          ? `Limited to what “${service.title}” offers. Add more on the service to widen this.`
          : 'The first thing a client checks — whether they are buying a job or buying time.'
      }
    />
  );
}
