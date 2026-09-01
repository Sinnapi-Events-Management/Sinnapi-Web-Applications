import { Controller, type Control } from 'react-hook-form';
import { Alert, Box, Button, Stack } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import type { PackageFormValues } from '../../schema';
import type { PackageTiersController } from '../../hooks/usePackageEditor';
import PackageSectionHeading from '../atoms/PackageSectionHeading';
import PackageTierFields from '../molecules/PackageTierFields';

type Props = {
  control: Control<PackageFormValues>;
  tiers: PackageTiersController;
};

/**
 * The price points, and the one the vendor wants read first.
 *
 * The recommended flag is bound per tier with a `Controller` rather than
 * watched across the whole array: marking one clears the others, so all of them
 * change at once, and a single watch over the array would re-render every tier
 * body — line items included — on each toggle.
 */
export default function PackageTiersSection({ control, tiers }: Props) {
  return (
    <Box>
      <PackageSectionHeading
        title="Tiers"
        hint="Two or three price points let a client choose rather than decide whether. Star the one you want read first."
      />

      {tiers.error && (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          {tiers.error}
        </Alert>
      )}

      <Stack spacing={2} sx={{ mt: 2 }}>
        {tiers.fields.map((field, index) => (
          <Controller
            key={field.id}
            name={`tiers.${index}.is_recommended`}
            control={control}
            render={({ field: recommended }) => (
              <PackageTierFields
                index={index}
                control={control}
                isRecommended={Boolean(recommended.value)}
                canRemove={tiers.canRemove}
                onRecommend={() => tiers.recommend(index)}
                onRemove={() => tiers.remove(index)}
              />
            )}
          />
        ))}
      </Stack>

      <Button startIcon={<AddIcon />} onClick={tiers.add} sx={{ mt: 2 }}>
        Add tier
      </Button>
    </Box>
  );
}
