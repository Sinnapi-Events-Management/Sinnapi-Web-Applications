import { Button, SectionCard } from '@sinnapi/ui';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import AddIcon from '@mui/icons-material/Add';
import AgendaList from '../molecules/AgendaList';
import type { AgendaCounts, AgendaFilter, MonthGroup } from '../../schema';

type Props = {
  groups: MonthGroup[];
  counts: AgendaCounts;
  filter: AgendaFilter;
  onFilterChange: (next: AgendaFilter) => void;
  onUnblock: (id: string) => void;
  onSelect: (date: string) => void;
  onBlock: () => void;
  removingId: string | null;
};

/**
 * The agenda as its own card, for the screens too narrow for a rail.
 *
 * On a phone there is one column, so the tabs the rail uses would be hiding one
 * of two things that both fit — the day arrives as a sheet instead, and this
 * simply follows the calendar down the page. Same list, same filters, same
 * rows: it is `AgendaList` either way.
 */
export default function UnavailableDatesSection({
  groups,
  counts,
  filter,
  onFilterChange,
  onUnblock,
  onSelect,
  onBlock,
  removingId,
}: Props) {
  return (
    <SectionCard
      title="Unavailable dates"
      subtitle="Blocks you can lift, and the bookings that set their own"
      icon={<EventBusyIcon />}
      action={
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={onBlock}
          sx={{ textTransform: 'none' }}
        >
          Block dates
        </Button>
      }
    >
      <AgendaList
        groups={groups}
        counts={counts}
        filter={filter}
        onFilterChange={onFilterChange}
        onUnblock={onUnblock}
        onSelect={onSelect}
        removingId={removingId}
      />
    </SectionCard>
  );
}
