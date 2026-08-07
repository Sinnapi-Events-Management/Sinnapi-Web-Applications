import { Box, FormControlLabel, Checkbox } from '@sinnapi/ui';
import type { ServiceRegionModel } from '@/lib/types';

type RegionCheckboxGridProps = {
  regions: ServiceRegionModel[];
  selected: string[];
  onToggle: (key: string) => void;
  disabled?: boolean;
};

/**
 * The coverage options as checkboxes rather than a multi-select.
 *
 * There are only eight regions and a vendor picks several, so a list that shows
 * every option and its state at once beats a dropdown that hides them behind a
 * click and reports the result as a row of chips. Checkboxes are also the
 * control screen readers and keyboards handle best for a multi-choice set.
 */
export default function RegionCheckboxGrid({
  regions,
  selected,
  onToggle,
  disabled = false,
}: RegionCheckboxGridProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          lg: 'repeat(3, minmax(0, 1fr))',
        },
        columnGap: 2,
      }}
    >
      {regions.map((region) => (
        <FormControlLabel
          key={region.key}
          control={
            <Checkbox
              checked={selected.includes(region.key)}
              onChange={() => onToggle(region.key)}
              disabled={disabled}
            />
          }
          label={region.name}
        />
      ))}
    </Box>
  );
}
