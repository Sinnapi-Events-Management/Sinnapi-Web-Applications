import { Alert, SectionCard, Stack, Typography } from '@sinnapi/ui';
import TuneIcon from '@mui/icons-material/Tune';
import type { BookingStatusSpec, BookingStatusTarget } from '../../schema/statusActions';
import BookingStatusButtons from '../molecules/BookingStatusButtons';

type Props = {
  targets: BookingStatusSpec[];
  onSelect: (status: BookingStatusTarget) => void;
  busy: boolean;
  error: string | null;
};

/**
 * The console's lifecycle control: the transitions this booking can be moved to
 * from where it stands.
 *
 * Pinned above the tabs rather than filed inside one of them, and that is the
 * point of it. An operator opens this page from a support thread with something
 * to change; the override is the reason they are here, and the record they need
 * to justify it is now a tab away rather than a scroll away. A control that
 * only exists on the section they happen not to be on is a control they have to
 * go hunting for — and this is the one that matters most.
 *
 * Buttons rather than a status dropdown. A picker implies every status is
 * equally available and defers the refusal to submit time — this offers only
 * the moves `admin_set_booking_status` will accept, so an operator never
 * composes an invalid one. The caption is not boilerplate either: this is the
 * one control on the page that changes someone else's booking, and it should
 * say so before it is used, not after.
 *
 * Unlike the quotation pages' bars, this one stays put when there is nothing to
 * do. A settled booking still gets the bar, saying so — the console's whole
 * reason for opening a booking is to change it, and a control that quietly
 * disappeared would read as a permissions fault rather than as a finished
 * booking.
 */
export default function BookingActionBar({ targets, onSelect, busy, error }: Props) {
  const hasTargets = targets.length > 0;

  return (
    <SectionCard
      title="Change status"
      icon={<TuneIcon />}
      accent={hasTargets ? 'secondary' : 'info'}
      sx={{ mb: 3 }}
    >
      <Stack spacing={1.5}>
        {error && <Alert severity="error">{error}</Alert>}

        {!hasTargets ? (
          <Typography variant="body2" color="text.secondary">
            This booking has settled. Nothing can be changed from here.
          </Typography>
        ) : (
          <>
            <BookingStatusButtons targets={targets} onSelect={onSelect} busy={busy} />
            <Typography variant="caption" color="text.secondary">
              Overrides act on the client&rsquo;s and vendor&rsquo;s booking. Each one needs a
              reason, and both the reason and your name are kept on the record.
            </Typography>
          </>
        )}
      </Stack>
    </SectionCard>
  );
}
