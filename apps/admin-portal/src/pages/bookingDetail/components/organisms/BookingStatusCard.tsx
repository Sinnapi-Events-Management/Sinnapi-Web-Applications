import { Alert, Button, SectionCard, Stack, Typography } from '@sinnapi/ui';
import TuneIcon from '@mui/icons-material/Tune';
import type { BookingStatusSpec, BookingStatusTarget } from '../../schema/statusActions';

type Props = {
  targets: BookingStatusSpec[];
  onSelect: (status: BookingStatusTarget) => void;
  busy: boolean;
  error: string | null;
};

/**
 * The console's lifecycle control: the transitions this booking can be moved
 * to from where it stands.
 *
 * Buttons rather than a status dropdown. A picker implies every status is
 * equally available and defers the refusal to submit time — this offers only
 * the moves `admin_set_booking_status` will accept, so an operator never
 * composes an invalid one. The caption is not boilerplate either: this is the
 * one control on the page that changes someone else's booking, and it should
 * say so before it is used, not after.
 */
export default function BookingStatusCard({ targets, onSelect, busy, error }: Props) {
  return (
    <SectionCard
      title="Change status"
      icon={<TuneIcon />}
      accent={targets.length > 0 ? 'secondary' : 'info'}
    >
      <Stack spacing={1.5}>
        {error && <Alert severity="error">{error}</Alert>}

        {targets.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            This booking has settled. Nothing can be changed from here.
          </Typography>
        ) : (
          <>
            {targets.map((spec, i) => (
              <Button
                key={spec.status}
                variant={i === 0 ? 'contained' : 'outlined'}
                color={spec.tone === 'error' ? 'error' : spec.tone}
                disabled={busy}
                onClick={() => onSelect(spec.status)}
              >
                {spec.label}
              </Button>
            ))}
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
