import type { Control, UseFieldArrayReturn } from 'react-hook-form';
import { Box, Button, IconButton, Stack, Typography } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { PlanFormValues } from '../../schema';
import ControlledField from './ControlledField';

type FeatureArray = UseFieldArrayReturn<PlanFormValues, 'features'>;

type Props = {
  control: Control<PlanFormValues>;
  fields: FeatureArray['fields'];
  append: FeatureArray['append'];
  remove: FeatureArray['remove'];
};

/**
 * Editable bullet list rendered on the marketing card. Each row is one feature
 * string tracked by `useFieldArray`, with add/remove controls — the plan-side
 * equivalent of the mock's `features: string[]`.
 */
export default function FeatureListField({ control, fields, append, remove }: Props) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Features
      </Typography>

      {fields.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          No features yet. Add the bullets shown on the plan card.
        </Typography>
      ) : (
        <Stack spacing={1.5} sx={{ mb: 1.5 }}>
          {fields.map((field, index) => (
            <Stack key={field.id} direction="row" spacing={1} alignItems="flex-start">
              <ControlledField
                name={`features.${index}.value`}
                control={control}
                label={`Feature ${index + 1}`}
                placeholder="e.g. Priority search placement"
              />
              <IconButton
                onClick={() => remove(index)}
                aria-label={`Remove feature ${index + 1}`}
                sx={{ mt: 0.5 }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      )}

      <Button size="small" startIcon={<AddIcon />} onClick={() => append({ value: '' })}>
        Add feature
      </Button>
    </Box>
  );
}
