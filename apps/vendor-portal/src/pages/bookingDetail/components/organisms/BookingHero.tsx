import type { ReactNode } from 'react';
import {
  Avatar,
  Box,
  CopyButton,
  HeroSurface,
  IconButton,
  Stack,
  StatusChip,
  Tooltip,
  Typography,
  heroAvatarSx,
} from '@sinnapi/ui';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonthOutlined';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import TagIcon from '@mui/icons-material/Tag';
import PhoneIcon from '@mui/icons-material/PhoneOutlined';
import { formatDate, formatMoney } from '@/lib/config';
import { bookingWhat, relativeDay } from '@/lib/bookingCopy';
import type { DirectoryProfile, VendorBookingDetailModel } from '@/lib/types';
import BookingInvoiceAction from '../molecules/BookingInvoiceAction';

type Props = {
  booking: VendorBookingDetailModel;
  client: DirectoryProfile | null;
  timeWindow: string | null;
};

/** One fact in the metadata row: a small icon and its text, never wrapping inside. */
function Meta({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      sx={{ minWidth: 0, color: 'text.secondary', '& svg': { fontSize: 18 } }}
    >
      {icon}
      <Typography variant="body2" component="span" sx={{ color: 'text.primary' }}>
        {children}
      </Typography>
    </Stack>
  );
}

/**
 * The booking header, compact (redesigned 2026-11-18 after the previous
 * version stacked full-width buttons and spent a row per fact).
 *
 * Follows the record-header pattern of current SaaS tools: who and the status
 * on one line, the key facts — when, where, the booking code — in one
 * wrapping metadata row, and the money with the page's secondary actions
 * (Call, invoice) together on the right. On a phone the right-hand block drops
 * under the facts as one row: amount on the left, actions on the right.
 * The page's main action stays in the "What to do now" card below.
 */
export default function BookingHero({ booking: b, client, timeWindow }: Props) {
  const name = client?.full_name ?? 'Client';
  const what = bookingWhat(b);
  const when = relativeDay(b.event_date);
  const phone = client?.contact_visible ? client.phone : null;

  return (
    <HeroSurface sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 2, md: 3 }}
        alignItems={{ md: 'center' }}
        sx={{ position: 'relative', minWidth: 0 }}
      >
        {/* Identity + facts */}
        <Stack direction="row" spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
          <Avatar sx={{ ...heroAvatarSx, width: 44, height: 44, flexShrink: 0 }}>
            {name.charAt(0)}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
              <Typography
                variant="h6"
                component="h1"
                fontWeight={700}
                sx={{ lineHeight: 1.25, overflowWrap: 'anywhere' }}
              >
                {name}
              </Typography>
              <StatusChip status={b.status} domain="booking" />
            </Stack>
            {what && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {what}
              </Typography>
            )}
            <Stack
              direction="row"
              useFlexGap
              flexWrap="wrap"
              columnGap={2}
              rowGap={0.5}
              alignItems="center"
              sx={{ mt: 1 }}
            >
              <Meta icon={<CalendarMonthIcon />}>
                {formatDate(b.event_date)}
                {timeWindow && `, ${timeWindow}`}
                {when && (
                  <Box component="span" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {' · '}
                    {when}
                  </Box>
                )}
              </Meta>
              {b.location && <Meta icon={<PlaceIcon />}>{b.location}</Meta>}
              {b.reference_no && (
                <Stack direction="row" alignItems="center" sx={{ ml: -0.5 }}>
                  <Meta icon={<TagIcon />}>
                    <Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {b.reference_no}
                    </Box>
                  </Meta>
                  <CopyButton value={b.reference_no} label="booking code" />
                </Stack>
              )}
            </Stack>
          </Box>
        </Stack>

        {/* Money + secondary actions */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            flexShrink: 0,
            justifyContent: 'space-between',
            pt: { xs: 1.5, md: 0 },
            borderTop: { xs: '1px solid', md: 'none' },
            borderLeft: { xs: 'none', md: '1px solid' },
            // The hero's own hairline colour — the theme divider read as a dark
            // rule on this surface.
            borderTopColor: 'var(--hero-divider)',
            borderLeftColor: 'var(--hero-divider)',
            pl: { md: 3 },
          }}
        >
          <Box sx={{ flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary" display="block" noWrap>
              Your money
            </Typography>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                fontSize: { xs: '1.05rem', sm: '1.25rem' },
              }}
            >
              {formatMoney(b.amount, b.currency)}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            {phone && (
              <Tooltip title={`Call ${phone}`}>
                <IconButton
                  component="a"
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  aria-label={`Call ${name}`}
                  color="secondary"
                  sx={{ width: 40, height: 40, border: 1, borderColor: 'secondary.main' }}
                >
                  <PhoneIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <BookingInvoiceAction booking={b} />
          </Stack>
        </Stack>
      </Stack>
    </HeroSurface>
  );
}
