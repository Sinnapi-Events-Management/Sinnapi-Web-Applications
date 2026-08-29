import { Button, Stack, StatusTabs, Typography } from '@sinnapi/ui';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import type { StatusTabOption } from '@sinnapi/ui';
import PlanUsageMeter from '../atoms/PlanUsageMeter';
import type { MediaCounts, MediaFilter } from '../../schema';
import type { PortfolioPlan } from '../../hooks/usePortfolioPlan';

type Props = {
  counts: MediaCounts;
  filter: MediaFilter;
  filterOptions: StatusTabOption<MediaFilter>[];
  plan: PortfolioPlan;
  canReorder: boolean;
  onFilter: (next: MediaFilter) => void;
  onAdd: () => void;
};

/**
 * The bar above the grid: how much work is on show, what the plan allows, how to
 * rearrange it, and the way to add more.
 *
 * It stacks on a phone with a full-width button, so the primary action is a
 * thumb-width target rather than a chip in the corner. The reordering hint lives
 * here rather than on a tile because it describes the grid as a whole, and it
 * names both gestures — dragging is invisible until tried, and on a touch screen
 * it isn't available at all.
 *
 * The type tabs appear only once the vendor has both photos and video; see
 * `mediaFilterOptions` for why an empty filter is worse than no filter.
 */
export default function PortfolioToolbar({
  counts,
  filter,
  filterOptions,
  plan,
  canReorder,
  onFilter,
  onAdd,
}: Props) {
  return (
    <Stack spacing={2} sx={{ mb: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
      >
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">
            {counts.all === 0
              ? 'Nothing in your portfolio yet.'
              : `${counts.all} ${counts.all === 1 ? 'item' : 'items'} on your public profile.`}
          </Typography>
          {canReorder && (
            <Typography variant="caption" color="text.secondary">
              Drag a tile to reorder, or use the arrows on it. Clients see this order.
            </Typography>
          )}
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <PlanUsageMeter used={plan.imageCount} limit={plan.maxImages} planName={plan.planName} />
          <Button
            variant="contained"
            startIcon={<AddPhotoAlternateOutlinedIcon />}
            onClick={onAdd}
            sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}
          >
            Add media
          </Button>
        </Stack>
      </Stack>

      {filterOptions.length > 1 && (
        <StatusTabs
          options={filterOptions}
          value={filter}
          onChange={onFilter}
          ariaLabel="Filter portfolio by media type"
        />
      )}
    </Stack>
  );
}
