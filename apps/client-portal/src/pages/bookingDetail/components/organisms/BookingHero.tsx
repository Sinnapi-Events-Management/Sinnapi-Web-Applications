import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  CopyButton,
  HeroSurface,
  IconButton,
  Link,
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
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined';
import { formatDate, formatMoney } from '@/lib/config';
import { useClientBookingInvoice } from '@/hooks/documentQueries';
import type { BookingDetailModel, DirectoryProfile, VendorRefModel } from '@/lib/types';

type Props = {
  booking: BookingDetailModel;
  vendor: VendorRefModel | null;
  /** The vendor's contact; the phone is withheld until the booking is past `requested`. */
  vendorContact: DirectoryProfile | null;
  timeWindow: string | null;
};

/** One fact in the metadata row: a small icon and its text. */
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
 * The booking header, compact — the same layout as the vendor portal's
 * (2026-11-18): the vendor and the status on one line, the facts (when,
 * where, booking code) in one wrapping row, and the amount with the page's
 * secondary actions — call the vendor, view their invoice — on the right. On a
 * phone that block drops under the facts as one row.
 */
export default function BookingHero({ booking: b, vendor, vendorContact, timeWindow }: Props) {
  const name = vendor?.business_name ?? 'Vendor';
  const phone = vendorContact?.contact_visible ? vendorContact.phone : null;
  const { data: invoice } = useClientBookingInvoice(b.id);

  return (
    <HeroSurface sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 2, md: 3 }}
        alignItems={{ md: 'center' }}
        sx={{ position: 'relative', minWidth: 0 }}
      >
        <Stack direction="row" spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
          <Avatar
            src={vendor?.primary_image_url ?? undefined}
            sx={{ ...heroAvatarSx, width: 44, height: 44, flexShrink: 0 }}
          >
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
                {vendor?.slug ? (
                  <Link
                    component={RouterLink}
                    to={`/discover/vendors/${vendor.slug}`}
                    color="inherit"
                    underline="hover"
                  >
                    {name}
                  </Link>
                ) : (
                  name
                )}
              </Typography>
              <StatusChip status={b.status} domain="booking" />
            </Stack>
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
              </Meta>
              {b.location && <Meta icon={<PlaceIcon />}>{b.location}</Meta>}
              {b.reference_no && (
                <Stack direction="row" alignItems="center" sx={{ ml: -0.5 }}>
                  <Meta icon={<TagIcon />}>
                    <Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {b.reference_no}
                    </Box>
                  </Meta>
                  {/* Copyable: clients paste the code to their vendor or support. */}
                  <CopyButton value={b.reference_no} label="booking code" />
                </Stack>
              )}
            </Stack>
          </Box>
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            flexShrink: 0,
            justifyContent: 'space-between',
            pt: { xs: 1.5, md: 0 },
            pl: { md: 3 },
            borderTop: { xs: '1px solid', md: 'none' },
            borderLeft: { xs: 'none', md: '1px solid' },
            borderTopColor: 'var(--hero-divider)',
            borderLeftColor: 'var(--hero-divider)',
          }}
        >
          <Box sx={{ flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary" display="block" noWrap>
              Booking price
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
            {invoice && (
              <Button
                component={RouterLink}
                to={`/invoices/${invoice.id}`}
                size="small"
                variant="outlined"
                color="secondary"
                startIcon={<ReceiptLongIcon />}
                sx={{
                  minHeight: 40,
                  px: { xs: 1, sm: 1.5 },
                  whiteSpace: 'nowrap',
                  '& .MuiButton-startIcon': { display: { xs: 'none', sm: 'inherit' } },
                }}
              >
                View invoice
              </Button>
            )}
          </Stack>
        </Stack>
      </Stack>
    </HeroSurface>
  );
}
