import { Box, Divider, Stack, Typography } from '@sinnapi/ui';
import { alpha } from '@mui/material/styles';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import TagIcon from '@mui/icons-material/Tag';
import NotesIcon from '@mui/icons-material/Notes';
import TooltipFact from '../atoms/TooltipFact';
import { formatMoney, titleize } from '@/lib/config';
import { formatTimeRange, isBookingBlock } from '../../schema';
import type { BlockedDateModel } from '@/lib/types';

type Props = {
  /** Everything blocking this day — a booking, a manual block, or both. */
  rows: BlockedDateModel[];
  /** Resolves a client id to a name, or null when the directory has not said. */
  clientName: (id: string | null | undefined) => string | null;
};

/**
 * What a vendor sees on hovering an unavailable day.
 *
 * The point of it is that the grid already says a day is gone — the tooltip is
 * the only thing that says *why*, without a click to the day panel or a trip to
 * the bookings list. So it leads with whose job it is, then the facts a vendor
 * actually plans around: when, where, and for how much.
 *
 * The status is stated rather than assumed. A confirmed booking inserts its
 * block, but nothing removes that block if the booking is later cancelled, so a
 * day can legitimately be held by a job that is no longer happening — and a
 * tooltip that only ever said "Confirmed booking" would hide exactly that.
 */
export default function DayTooltipContent({ rows, clientName }: Props) {
  return (
    <Stack
      spacing={1}
      // White, not `divider`: MUI's tooltip surface is the same dark grey in
      // both colour schemes, so the theme's own divider would vanish into it in
      // light mode.
      divider={<Divider sx={{ borderColor: (t) => alpha(t.palette.common.white, 0.2) }} />}
    >
      {rows.map((row) => {
        const booking = row.bookings;
        const fromBooking = isBookingBlock(row);

        if (!fromBooking) {
          return (
            <Box key={row.id}>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                Blocked by you
              </Typography>
              <TooltipFact icon={<NotesIcon />}>{row.reason ?? 'No reason given'}</TooltipFact>
            </Box>
          );
        }

        return (
          <Box key={row.id}>
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
              {booking?.status ? titleize(booking.status) : 'Confirmed'} booking
            </Typography>
            <Stack spacing={0.25} sx={{ mt: 0.25 }}>
              <TooltipFact icon={<PersonOutlineIcon />}>
                {clientName(booking?.client_id)}
              </TooltipFact>
              <TooltipFact icon={<TagIcon />}>{booking?.reference_no}</TooltipFact>
              <TooltipFact icon={<ScheduleIcon />}>
                {formatTimeRange(booking?.start_time ?? null, booking?.end_time ?? null)}
              </TooltipFact>
              <TooltipFact icon={<PlaceOutlinedIcon />}>{booking?.location}</TooltipFact>
              <TooltipFact icon={<PaymentsOutlinedIcon />}>
                {booking?.amount != null ? formatMoney(booking.amount, booking.currency) : null}
              </TooltipFact>
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}
