import { Box } from '@sinnapi/ui';
import ScheduleSendIcon from '@mui/icons-material/ScheduleSend';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { formatMoney } from '@/lib/config';
import TimelineStop from '../atoms/TimelineStop';
import { formatReleaseDate, releaseWhen } from '../../utils/scheduleDates';

type Props = {
  advanceRate: number | null;
  advanceAmount: number | null;
  balanceAmount: number | null;
  daysBefore: number | null;
  releaseDueAt: string | null;
  currency: string | null;
};

/**
 * The chosen schedule as a two-stop timeline: what leaves early and when, then
 * what stays protected and until when.
 *
 * Money first and the percentage second — "USh 400,000 on 23 September" is
 * what the client is actually agreeing to; "50%" is the arithmetic behind it.
 * A timeline rather than a paragraph because the thing being agreed to is a
 * sequence, and a sequence scans faster drawn than described.
 */
export default function AdvanceScheduleTimeline({
  advanceRate,
  advanceAmount,
  balanceAmount,
  daysBefore,
  releaseDueAt,
  currency,
}: Props) {
  const protectedCaption = 'Until you confirm the service was delivered';

  // Zero is a real choice, not an empty state, and it deserves its own stop:
  // the alternative reads as "USh 0 released to your vendor", which states a
  // non-event as if it were part of the schedule.
  const releasesEarly = !(advanceRate != null && advanceRate <= 0);

  return (
    <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {releasesEarly ? (
        <>
          <TimelineStop
            tone="secondary"
            icon={<ScheduleSendIcon />}
            connector
            title={
              <>
                {formatMoney(advanceAmount, currency)} released to your vendor
                {advanceRate ? ` (${Number(advanceRate)}% advance)` : ''}
              </>
            }
            caption={releaseWhen(formatReleaseDate(releaseDueAt), daysBefore)}
          />
          <TimelineStop
            tone="success"
            icon={<ShieldOutlinedIcon />}
            title={<>{formatMoney(balanceAmount, currency)} stays protected by Sinnapi</>}
            caption={protectedCaption}
          />
        </>
      ) : (
        <TimelineStop
          tone="success"
          icon={<ShieldOutlinedIcon />}
          title={
            <>
              Nothing is released early — the full {formatMoney(balanceAmount, currency)} stays
              protected by Sinnapi
            </>
          }
          caption={protectedCaption}
        />
      )}
    </Box>
  );
}
