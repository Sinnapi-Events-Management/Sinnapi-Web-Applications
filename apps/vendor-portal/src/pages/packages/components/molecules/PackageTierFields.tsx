import type { Control } from 'react-hook-form';
import { Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import { useTierLines } from '../../hooks/usePackageEditor';
import type { PackageFormValues } from '../../schema';
import PackageLineFields from './PackageLineFields';

type Props = {
  index: number;
  control: Control<PackageFormValues>;
  isRecommended: boolean;
  canRemove: boolean;
  onRecommend: () => void;
  onRemove: () => void;
};

/**
 * One tier of the package, and the lines that make up its price.
 *
 * Its own tinted block rather than a flat run of fields, because a package
 * with three tiers is otherwise thirty inputs in a column with nothing saying
 * where one tier ends and the next begins.
 *
 * The "recommended" control is a star rather than a checkbox: it behaves like a
 * radio across the tiers (marking one clears the rest), and a checkbox that
 * unticks its neighbours is a checkbox that lies about what it does.
 */
export default function PackageTierFields({
  index,
  control,
  isRecommended,
  canRemove,
  onRecommend,
  onRemove,
}: Props) {
  const lines = useTierLines(control, index);

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2,
        border: (t) =>
          `1px solid ${isRecommended ? alpha(t.palette.primary.main, 0.5) : t.palette.divider}`,
        bgcolor: (t) =>
          isRecommended
            ? alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.1 : 0.04)
            : 'transparent',
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1, minWidth: 0 }}>
            Tier {index + 1}
          </Typography>
          {isRecommended && <Chip size="small" color="primary" label="Recommended" />}
          <Tooltip
            title={isRecommended ? 'This is the tier clients see first' : 'Show this tier first'}
          >
            <IconButton
              aria-label="Mark as the recommended tier"
              aria-pressed={isRecommended}
              onClick={onRecommend}
              color={isRecommended ? 'primary' : 'default'}
            >
              {isRecommended ? <StarRoundedIcon /> : <StarBorderRoundedIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title={canRemove ? 'Remove tier' : 'A package needs at least one tier'}>
            <span>
              <IconButton aria-label="Remove tier" onClick={onRemove} disabled={!canRemove}>
                <DeleteOutlineIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <ControlledField
            name={`tiers.${index}.name`}
            control={control}
            label="Tier name"
            placeholder="Gold"
            sx={{ flex: 2 }}
          />
          <ControlledField
            name={`tiers.${index}.discount_rate`}
            control={control}
            label="Discount (%)"
            type="number"
            sx={{ flex: 1 }}
            inputProps={{ min: 0, max: 100, step: 5 }}
            helperText="Optional"
          />
        </Stack>

        <ControlledField
          name={`tiers.${index}.description`}
          control={control}
          label="What this tier is for (optional)"
          placeholder="Best for full-day weddings with two locations."
          multiline
          minRows={2}
        />

        <Box>
          <Typography variant="overline" color="text.secondary">
            Included lines
          </Typography>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {lines.fields.map((field, lineIndex) => (
              <PackageLineFields
                key={field.id}
                path={`tiers.${index}.items.${lineIndex}`}
                control={control}
                canRemove={lines.canRemove}
                onRemove={() => lines.remove(lineIndex)}
              />
            ))}
          </Stack>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={lines.add}
            sx={{ alignSelf: 'flex-start', mt: 1.5 }}
          >
            Add line
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
