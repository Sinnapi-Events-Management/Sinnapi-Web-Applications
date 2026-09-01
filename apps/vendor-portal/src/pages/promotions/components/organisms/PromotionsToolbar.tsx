import { Button, Stack, Tab, Tabs } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import { PROMOTION_FILTERS, type PromotionFilter } from '../../schema';

type Props = {
  filter: PromotionFilter;
  counts: Record<PromotionFilter, number>;
  onFilter: (filter: PromotionFilter) => void;
  onCreate: () => void;
};

/**
 * The campaign list's filter and its one primary action.
 *
 * Counts sit on the tabs rather than being left to be discovered, because the
 * state that matters here is "how many of mine are actually in front of clients
 * right now" — and a Live tab reading zero answers a question a vendor would
 * otherwise have to go looking for.
 *
 * The tabs scroll on narrow screens instead of wrapping, so the New-campaign
 * button never gets pushed off the row it shares with them; below `sm` the
 * button takes the full width so the primary action is a thumb-width target
 * rather than a chip in the corner.
 */
export default function PromotionsToolbar({ filter, counts, onFilter, onCreate }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      sx={{ mb: 3 }}
    >
      <Tabs
        value={filter}
        onChange={(_, value) => onFilter(value as PromotionFilter)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ flex: 1, minHeight: 40, '& .MuiTab-root': { minHeight: 40 } }}
      >
        {PROMOTION_FILTERS.map((option) => (
          <Tab
            key={option.value}
            value={option.value}
            label={`${option.label} (${counts[option.value]})`}
          />
        ))}
      </Tabs>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onCreate}
        sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}
      >
        New campaign
      </Button>
    </Stack>
  );
}
