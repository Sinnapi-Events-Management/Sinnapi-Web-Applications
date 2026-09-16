import { QueryState, Stack } from '@sinnapi/ui';
import RegionCheckboxGrid from '@/components/coverage/RegionCheckboxGrid';
import type { ServiceRegionModel } from '@/lib/types';
import CoverageGapNotice from '../atoms/CoverageGapNotice';

type Props = {
  regions: ServiceRegionModel[];
  selected: string[];
  onToggle: (key: string) => void;
  isLoading: boolean;
  error: unknown;
  isUncovered: boolean;
  disabled?: boolean;
};

/**
 * The region checklist and the warning that goes with an empty one.
 *
 * Takes the selection as props instead of calling `useServiceCoverage`, because
 * the draft has to outlive this panel: the vendor may tick regions, switch
 * section, and save from the shared bar. Save failures are shown in that bar.
 */
export default function CoverageFields({
  regions,
  selected,
  onToggle,
  isLoading,
  error,
  isUncovered,
  disabled,
}: Props) {
  return (
    <QueryState isLoading={isLoading} error={error}>
      <Stack spacing={2}>
        {isUncovered && <CoverageGapNotice />}
        <RegionCheckboxGrid
          regions={regions}
          selected={selected}
          onToggle={onToggle}
          disabled={disabled}
        />
      </Stack>
    </QueryState>
  );
}
