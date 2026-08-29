import { useMemo } from 'react';
import { useWatch, type Control } from 'react-hook-form';
import { useServices } from '@/hooks/queries';
import type { PackageFormValues } from '../schema';

/**
 * The editor's "Service" picker: what a package may be filed under.
 *
 * ARCHIVED SERVICES ARE READ BUT NOT OFFERED
 * The read includes them and the exclusion happens here, in the options,
 * because the two lists this returns answer different questions. A vendor
 * choosing where to file a package should not be offered a service they took
 * out of their catalogue — that is a choice they already made. But a package
 * ALREADY filed under one has to keep showing it, or MUI's Select renders a
 * blank box holding a value the vendor cannot see, cannot explain and cannot
 * clear. So the linked service stays in the list, labelled for what it is.
 *
 * `services` is the unfiltered list on purpose: `PackagePricingModelField`
 * narrows the charging methods to the linked service's set, and handing it a
 * list with that service missing would silently widen the choice to all four —
 * offering a model `save_quote_package` will refuse on save.
 */
export function usePackageServiceOptions(vendorId: string, control: Control<PackageFormValues>) {
  const { data } = useServices(vendorId, { includeArchived: true });
  const linkedId = useWatch({ control, name: 'vendor_service_id' });

  const services = useMemo(() => data ?? [], [data]);

  const options = useMemo(
    () => [
      { value: '', label: 'Not linked to a service' },
      ...services
        .filter((service) => !service.deleted_at || service.id === linkedId)
        .map((service) => ({
          value: service.id,
          label: service.deleted_at ? `${service.title} (archived)` : service.title,
        })),
    ],
    [services, linkedId],
  );

  return { services, options };
}
