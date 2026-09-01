import { Box, Button, Card, StatusTabs } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import DayDetail from '../molecules/DayDetail';
import AgendaList from '../molecules/AgendaList';
import type { CalendarController } from '../../hooks/useCalendar';
import type { CalendarRailController } from '../../hooks/useCalendarRail';

type Props = {
  calendar: CalendarController;
  rail: CalendarRailController;
};

/**
 * The column beside the month: one card, two readings, no scrolling for either.
 *
 * The agenda used to sit a full card-height below the grid, which is where a
 * vendor never scrolled to it — and the day panel it sat under was one sentence
 * tall next to a grid ten times its height. Tabbing them into the same rail
 * fixes both at once: the empty column fills, and the list that answers "when am
 * I next away?" is one press from the grid that cannot answer it.
 *
 * The rail sticks and scrolls inside itself rather than with the page. A month
 * grid is tall; a rail that scrolled away with it would put the tabs off screen
 * exactly when a vendor wanted to switch reading.
 *
 * It takes the two controllers whole. They are this page's own state, the panels
 * inside are handed only what they use, and threading a dozen callbacks through
 * a layout shell would be ceremony rather than clarity.
 */
export default function CalendarRail({ calendar, rail }: Props) {
  const showingAgenda = rail.tab === 'upcoming';

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: { xs: 'relative', lg: 'sticky' },
        top: { lg: 88 },
        // Bounded so the rail's own scroll takes over before the page's does.
        // `112px` is the sticky offset plus the breathing room under the card.
        maxHeight: { lg: 'calc(100vh - 112px)' },
        // The same accent bar `SectionCard` draws, so the rail reads as a
        // sibling of the calendar card rather than as a different kind of thing.
        '&::before': {
          content: '""',
          position: 'absolute',
          insetInline: 0,
          top: 0,
          height: 3,
          bgcolor: 'secondary.main',
          zIndex: 2,
        },
      }}
    >
      {/* Unpadded so the tab bar's underline spans the card, not the text. */}
      <Box sx={{ pt: 1.5, flexShrink: 0 }}>
        <StatusTabs
          value={rail.tab}
          onChange={rail.setTab}
          ariaLabel="Switch between the selected day and what is coming up"
          options={[
            { value: 'day', label: 'This day' },
            { value: 'upcoming', label: 'Upcoming', count: rail.counts.all },
          ]}
        />
      </Box>

      <Box
        role="tabpanel"
        aria-label={showingAgenda ? 'Upcoming unavailable dates' : 'The selected day'}
        sx={{
          px: { xs: 2.5, sm: 3 },
          pb: 3,
          flex: 1,
          // Without `minHeight: 0` a flex child refuses to shrink past its
          // content, and the overflow below never engages.
          minHeight: 0,
          overflowY: 'auto',
        }}
      >
        {showingAgenda ? (
          <AgendaList
            groups={rail.groups}
            counts={rail.counts}
            filter={rail.filter}
            onFilterChange={rail.setFilter}
            onUnblock={calendar.unblock}
            onSelect={rail.pickDate}
            removingId={calendar.removingId}
          />
        ) : (
          <DayDetail
            selection={calendar.selection}
            onBlock={rail.requestBlock}
            onUnblock={calendar.unblock}
            removingId={calendar.removingId}
          />
        )}
      </Box>

      {/* Blocking time off from the agenda needs no day picked first, so it is
          offered here rather than only on a day the vendor has tapped. */}
      {showingAgenda && (
        <Box sx={{ px: { xs: 2.5, sm: 3 }, py: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={rail.requestBlock}
            sx={{ textTransform: 'none' }}
          >
            Block dates
          </Button>
        </Box>
      )}
    </Card>
  );
}
