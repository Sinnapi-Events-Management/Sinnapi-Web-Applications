import { useController, type Control } from 'react-hook-form';
import { Stack } from '@sinnapi/ui';
import type { PackageFormValues } from '../../schema';
import PackageScopeFields from './PackageScopeFields';

/**
 * The two lists that define the edges of the offer.
 *
 * They are one section rather than two because they are read as a pair: the
 * exclusions only mean anything against the inclusions, and a vendor who writes
 * the first list without the second has described an offer with no boundary.
 *
 * Each list binds itself with `useController`, so typing into one does not
 * re-render the other — and neither is re-rendered by the rest of the editor.
 */
export default function PackageScopeSection({ control }: { control: Control<PackageFormValues> }) {
  const inclusions = useController({ name: 'inclusions', control });
  const exclusions = useController({ name: 'exclusions', control });

  return (
    <Stack spacing={3}>
      <PackageScopeFields
        label="What's included"
        hint="The promises a client can hold you to. One per line."
        placeholder="Edited photos delivered within 14 days"
        items={inclusions.field.value ?? []}
        onChange={inclusions.field.onChange}
      />
      <PackageScopeFields
        label="Not included"
        hint="The boundary. This is the list that prevents arguments after the event."
        placeholder="Transport outside Kampala"
        items={exclusions.field.value ?? []}
        onChange={exclusions.field.onChange}
      />
    </Stack>
  );
}
