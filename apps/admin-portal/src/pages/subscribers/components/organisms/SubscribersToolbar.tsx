import { Box, SearchField, Stack, ToggleButton, ToggleButtonGroup } from '@sinnapi/ui';
import { ALL_STATUSES } from '@/hooks/useStatusFilter';
import { CONSENT_STATUSES } from '../../schema';
import { titleizeStatus } from '@sinnapi/ui';

type Props = {
  search: { input: string; setInput: (v: string) => void; clear: () => void };
  statusValue: string;
  onStatusChange: (next: string) => void;
  /** The consent filter is meaningless on the suppression list. */
  showStatusFilter: boolean;
};

/** Address search, plus the consent-status filter on the subscriptions tab. */
export default function SubscribersToolbar({
  search,
  statusValue,
  onStatusChange,
  showStatusFilter,
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
          placeholder="Search by email address…"
          ariaLabel="Search subscribers"
        />
      </Box>

      {showStatusFilter && (
        <ToggleButtonGroup
          exclusive
          size="small"
          value={statusValue}
          onChange={(_, next) => onStatusChange(next ?? ALL_STATUSES)}
          aria-label="Filter by consent status"
        >
          <ToggleButton value={ALL_STATUSES}>All</ToggleButton>
          {CONSENT_STATUSES.map((s) => (
            <ToggleButton key={s} value={s}>
              {titleizeStatus(s)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}
    </Stack>
  );
}
