import type { Control } from 'react-hook-form';
import { Box, Button, Stack } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import type { PackageFormValues } from '../../schema';
import type { PackageAddOnsController } from '../../hooks/usePackageEditor';
import PackageSectionHeading from '../atoms/PackageSectionHeading';
import PackageLineFields from '../molecules/PackageLineFields';

type Props = {
  control: Control<PackageFormValues>;
  addOns: PackageAddOnsController;
};

/**
 * The extras offered alongside every tier.
 *
 * Flat rather than nested under a tier, because that is what they are: a
 * vendor prices them once and picks which ones apply when a quote is built.
 * They are never counted into a tier's total, which is why they are a section
 * of their own rather than more lines inside one.
 */
export default function PackageAddOnsSection({ control, addOns }: Props) {
  return (
    <Box>
      <PackageSectionHeading
        title="Optional add-ons"
        hint="Offered alongside every tier and never counted in a tier's total. You choose which ones to price in when you build a quote."
      />

      <Stack spacing={1.5} sx={{ mt: 2 }}>
        {addOns.fields.map((field, index) => (
          <PackageLineFields
            key={field.id}
            path={`add_ons.${index}`}
            control={control}
            canRemove
            onRemove={() => addOns.remove(index)}
          />
        ))}
      </Stack>

      <Button startIcon={<AddIcon />} onClick={addOns.add} sx={{ mt: 1.5 }}>
        Add an add-on
      </Button>
    </Box>
  );
}
