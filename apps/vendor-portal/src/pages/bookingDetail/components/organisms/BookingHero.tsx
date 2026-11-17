import {
  Avatar,
  Box,
  Button,
  Stack,
  Typography,
  StatusChip,
  HeroSurface,
  heroAvatarSx,
} from '@sinnapi/ui';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PlaceIcon from '@mui/icons-material/Place';
import PhoneIcon from '@mui/icons-material/Phone';
import type { ReactNode } from 'react';
import { formatDate, formatMoney } from '@/lib/config';
import { bookingWhat, relativeDay } from '@/lib/bookingCopy';
import type { DirectoryProfile, VendorBookingDetailModel } from '@/lib/types';

type Props = {
  booking: VendorBookingDetailModel;
  client: DirectoryProfile | null;
  timeWindow: string | null;
};

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0 }}>
      <Box sx={{ color: 'text.secondary', display: 'flex', mt: '2px', '& svg': { fontSize: 18 } }}>
        {icon}
      </Box>
      <Typography variant="body1" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
        {children}
      </Typography>
    </Stack>
  );
}

/**
 * Who the booking is with, what it is for, when, where and for how much — the
 * five things a vendor checks first. The booking code is kept, small, for
 * when they talk to support; it used to be the headline, which told a vendor
 * nothing about which job this was.
 */
export default function BookingHero({ booking: b, client, timeWindow }: Props) {
  const name = client?.full_name ?? 'Client';
  const what = bookingWhat(b);
  const when = relativeDay(b.event_date);
  const phone = client?.contact_visible ? client.phone : null;

  return (
    <HeroSurface>
      <Stack spacing={2} sx={{ position: 'relative', minWidth: 0 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar sx={{ ...heroAvatarSx, width: 48, height: 48 }}>{name.charAt(0)}</Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="h5"
              component="h1"
              fontWeight={700}
              sx={{ lineHeight: 1.2, overflowWrap: 'anywhere' }}
            >
              {name}
            </Typography>
            {what && (
              <Typography variant="body1" color="text.secondary" noWrap>
                {what}
              </Typography>
            )}
          </Box>
          <StatusChip status={b.status} size="medium" domain="booking" />
        </Stack>

        <Stack spacing={1}>
          <Fact icon={<CalendarMonthIcon />}>
            {formatDate(b.event_date)}
            {timeWindow && `, ${timeWindow}`}
            {when && (
              <Box component="span" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                {' · '}
                {when}
              </Box>
            )}
          </Fact>
          {b.location && <Fact icon={<PlaceIcon />}>{b.location}</Fact>}
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ pt: 1.5, borderTop: 1, borderColor: 'divider' }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Your money for this booking
            </Typography>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{ fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}
            >
              {formatMoney(b.amount, b.currency)}
            </Typography>
          </Box>
          {phone && (
            <Button
              href={`tel:${phone.replace(/\s+/g, '')}`}
              variant="outlined"
              startIcon={<PhoneIcon />}
              sx={{ minHeight: 44, flexShrink: 0 }}
            >
              Call
            </Button>
          )}
        </Stack>

        {b.reference_no && (
          <Typography variant="caption" color="text.secondary">
            Booking code {b.reference_no}
          </Typography>
        )}
      </Stack>
    </HeroSurface>
  );
}
