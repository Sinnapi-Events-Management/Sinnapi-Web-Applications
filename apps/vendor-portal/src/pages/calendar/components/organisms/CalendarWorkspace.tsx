import { Alert, QueryState, Stack } from '@sinnapi/ui';
import CalendarSplitLayout from './CalendarSplitLayout';
import CalendarStackedLayout from './CalendarStackedLayout';
import BlockDateDialog from './BlockDateDialog';
import { useCalendar } from '../../hooks/useCalendar';
import { useCalendarRail } from '../../hooks/useCalendarRail';

/**
 * The scheduling hub: the read behind it, and which shape it takes.
 *
 * Wiring only. Every figure on the page comes from `useCalendar`, which derives
 * them all from one read so the panels cannot disagree about a month; how the
 * second column behaves — and whether there is one — is `useCalendarRail`.
 *
 * The two layouts are separate components rather than one set of responsive
 * `sx` props because they are not the same screen at different widths: a wide
 * one answers a tap in a rail, a narrow one answers it in a sheet. Rendering
 * only the one in play also keeps the agenda out of the DOM twice, which is
 * what a CSS-only split would have cost.
 */
export default function CalendarWorkspace({ vendorId }: { vendorId: string }) {
  const calendar = useCalendar(vendorId);
  const rail = useCalendarRail({
    groups: calendar.groups,
    selectDate: calendar.selectDate,
    openBlockDialog: calendar.openBlockDialog,
  });

  return (
    <>
      <Stack spacing={2}>
        {calendar.error && (
          <Alert severity="error" onClose={calendar.dismissError}>
            {calendar.error}
          </Alert>
        )}
        {calendar.notice && (
          <Alert severity="success" onClose={calendar.dismissNotice}>
            {calendar.notice}
          </Alert>
        )}

        <QueryState isLoading={calendar.blocked.isLoading} error={calendar.blocked.error}>
          {rail.isCompact ? (
            <CalendarStackedLayout calendar={calendar} rail={rail} />
          ) : (
            <CalendarSplitLayout calendar={calendar} rail={rail} />
          )}
        </QueryState>
      </Stack>

      <BlockDateDialog
        vendorId={vendorId}
        date={calendar.blockSeedDate}
        today={calendar.today}
        unavailable={calendar.days.all}
        open={calendar.blockOpen}
        onClose={calendar.closeBlockDialog}
        onSuccess={calendar.confirmBlocked}
      />
    </>
  );
}
