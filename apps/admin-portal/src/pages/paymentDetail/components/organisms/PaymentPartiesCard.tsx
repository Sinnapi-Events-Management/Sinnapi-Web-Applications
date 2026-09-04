import { Link as RouterLink } from 'react-router-dom';
import { Box, Divider, Link, SectionCard, Stack, StatusChip, Typography } from '@sinnapi/ui';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import { formatDate } from '@/lib/config';
import type { PaymentAdminDetailModel } from '@/lib/types';
import PartyRow from '@/pages/bookingDetail/components/molecules/PartyRow';

type Props = { payment: PaymentAdminDetailModel };

/**
 * Who paid and what they were paying for, with the routes onward to each.
 *
 * `PartyRow` is the booking page's, reused rather than copied: the payer is
 * the same kind of person with the same two ways to reach them. Where the
 * payer's link goes depends on who they are: a client has a console page of
 * their own, a vendor owner paying a subscription does not, so that link goes
 * to the vendor listing the subscription belongs to.
 */
export default function PaymentPartiesCard({ payment: p }: Props) {
  const payerTo = p.payer.vendor_id ? `/vendors/${p.payer.vendor_id}` : `/clients/${p.payer.id}`;
  const payerIcon = p.payer.vendor_id ? <StorefrontIcon /> : <PersonIcon />;

  return (
    <SectionCard title="Payer & purpose" icon={<PeopleIcon />} accent="info">
      <Stack spacing={2} divider={<Divider flexItem />}>
        <PartyRow role="Payer" party={p.payer} icon={payerIcon} to={payerTo} />

        {p.booking && (
          <RecordRow
            role="Booking"
            icon={<ReceiptLongOutlinedIcon />}
            title={p.booking.reference_no ?? 'Booking'}
            to={`/bookings/${p.booking.id}`}
            status={p.booking.status}
            lines={[
              p.booking.vendor.name && (
                <Link
                  key="vendor"
                  component={RouterLink}
                  to={`/vendors/${p.booking.vendor.id}`}
                  variant="caption"
                  underline="hover"
                >
                  {p.booking.vendor.name}
                </Link>
              ),
              p.booking.event_date && (
                <Typography key="date" variant="caption" color="text.secondary">
                  Event {formatDate(p.booking.event_date)}
                </Typography>
              ),
            ]}
          />
        )}

        {p.subscription && (
          <RecordRow
            role="Subscription"
            icon={<WorkspacePremiumOutlinedIcon />}
            title={p.subscription.vendor_name ?? 'Vendor'}
            to={`/vendors/${p.subscription.vendor_id}`}
            status={p.subscription.status}
            lines={[
              <Typography key="plan" variant="caption" color="text.secondary">
                {p.subscription.plan_name ?? 'No plan recorded'}
              </Typography>,
            ]}
          />
        )}

        {!p.booking && !p.subscription && (
          <Typography variant="body2" color="text.secondary">
            This payment is attached to neither a booking nor a subscription.
          </Typography>
        )}
      </Stack>
    </SectionCard>
  );
}

type RecordRowProps = {
  role: string;
  icon: React.ReactNode;
  title: string;
  to: string;
  status: string;
  lines: React.ReactNode[];
};

/** One record the payment was for, laid out like a party so the card reads as one list. */
function RecordRow({ role, icon, title, to, status, lines }: RecordRowProps) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'action.selected',
          color: 'text.secondary',
          flexShrink: 0,
          '& svg': { fontSize: 20 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {role}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="subtitle2" fontWeight={700} noWrap>
            <Link component={RouterLink} to={to} underline="hover" color="inherit">
              {title}
            </Link>
          </Typography>
          <StatusChip status={status} />
        </Stack>
        <Stack spacing={0.25} sx={{ mt: 0.5 }}>
          {lines}
        </Stack>
      </Box>
    </Stack>
  );
}
