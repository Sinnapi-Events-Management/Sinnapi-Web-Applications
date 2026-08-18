import { Stack, Box, Button, SearchField, ToggleButton, ToggleButtonGroup } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import { AUDIENCE_META, NEWSLETTER_AUDIENCES } from '../../schema';
import { ALL_STATUSES } from '@/hooks/useStatusFilter';

type Props = {
  search: { input: string; setInput: (v: string) => void; clear: () => void };
  audienceValue: string;
  onAudienceChange: (next: string) => void;
  onCreate: () => void;
};

/**
 * Search, the audience filter, and the one action that starts everything.
 *
 * The audience filter is a segmented control rather than a third tab row: it is
 * orthogonal to status (you want "vendor drafts", not "vendors OR drafts"), and
 * stacking two tab strips makes neither read as a filter.
 */
export default function NewslettersToolbar({
  search,
  audienceValue,
  onAudienceChange,
  onCreate,
}: Props) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      alignItems={{ md: 'center' }}
      sx={{ mb: 2 }}
    >
      <Box sx={{ flex: 1, minWidth: { md: 240 } }}>
        <SearchField
          value={search.input}
          onChange={search.setInput}
          onClear={search.clear}
          placeholder="Search campaign name or subject…"
          ariaLabel="Search campaigns"
        />
      </Box>

      <ToggleButtonGroup
        exclusive
        size="small"
        value={audienceValue}
        onChange={(_, next) => onAudienceChange(next ?? ALL_STATUSES)}
        aria-label="Filter campaigns by audience"
      >
        <ToggleButton value={ALL_STATUSES}>All</ToggleButton>
        {NEWSLETTER_AUDIENCES.map((key) => (
          <ToggleButton key={key} value={key}>
            {AUDIENCE_META[key].label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>
        New campaign
      </Button>
    </Stack>
  );
}
