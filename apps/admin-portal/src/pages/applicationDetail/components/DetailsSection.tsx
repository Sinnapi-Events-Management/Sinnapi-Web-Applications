import { Grid, Box, Typography, Divider, alpha } from '@sinnapi/ui';
import InfoIcon from '@mui/icons-material/Info';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import BadgeIcon from '@mui/icons-material/Badge';
import PlaceIcon from '@mui/icons-material/Place';
import BusinessIcon from '@mui/icons-material/Business';
import TimelineIcon from '@mui/icons-material/Timeline';
import SellIcon from '@mui/icons-material/Sell';
import PaymentsIcon from '@mui/icons-material/Payments';
import ScheduleIcon from '@mui/icons-material/Schedule';
import NumbersIcon from '@mui/icons-material/Numbers';
import ReceiptIcon from '@mui/icons-material/Receipt';
import SchoolIcon from '@mui/icons-material/School';
import SectionCard from '@/components/ui/SectionCard';
import InfoRow from '@/components/ui/InfoRow';
import { formatDate, formatMoney, titleize } from '@/lib/config';
import type { IntakeDetailModel } from '@/lib/types';

/** Two-column key/value grid of the applicant + business particulars. */
export default function DetailsSection({ a }: { a: IntakeDetailModel }) {
  const left = [
    { label: 'Applicant', value: a.owner_full_name, icon: <PersonIcon /> },
    { label: 'Email', value: a.owner_email, icon: <EmailIcon />, copy: a.owner_email },
    { label: 'Phone', value: a.owner_phone, icon: <PhoneIcon />, copy: a.owner_phone },
    {
      label: 'Applicant type',
      value: a.applicant_type ? titleize(a.applicant_type) : null,
      icon: <BadgeIcon />,
    },
    { label: 'Base city', value: a.base_city, icon: <PlaceIcon /> },
    { label: 'Location', value: a.business_location, icon: <BusinessIcon /> },
    { label: 'Submitted', value: formatDate(a.created_at), icon: <ScheduleIcon /> },
  ];
  const right = [
    {
      label: 'Years in operation',
      value: a.years_in_operation || null,
      icon: <TimelineIcon />,
    },
    {
      label: 'Pricing model',
      value: a.pricing_model ? titleize(a.pricing_model) : null,
      icon: <SellIcon />,
    },
    {
      label: 'Starting price',
      value: formatMoney(a.starting_price, a.starting_price_currency),
      icon: <PaymentsIcon />,
    },
    { label: 'Lead time', value: a.lead_time || null, icon: <ScheduleIcon /> },
    {
      label: 'Business reg #',
      value: a.business_reg_number,
      icon: <NumbersIcon />,
      mono: true,
      copy: a.business_reg_number,
    },
    { label: 'Tax ID', value: a.tax_id, icon: <ReceiptIcon />, mono: true, copy: a.tax_id },
    { label: 'iCandy alumni', value: a.icandy_alumni ? 'Yes' : 'No', icon: <SchoolIcon /> },
  ];

  return (
    <SectionCard title="Application details" icon={<InfoIcon />} accent="secondary">
      <Grid container columnSpacing={4}>
        <Grid item xs={12} md={6}>
          {left.map((r) => (
            <InfoRow
              key={r.label}
              label={r.label}
              value={r.value ?? undefined}
              icon={r.icon}
              copyValue={r.copy ?? undefined}
            />
          ))}
        </Grid>
        <Grid item xs={12} md={6}>
          {right.map((r) => (
            <InfoRow
              key={r.label}
              label={r.label}
              value={r.value ?? undefined}
              icon={r.icon}
              mono={r.mono}
              copyValue={r.copy ?? undefined}
            />
          ))}
        </Grid>
      </Grid>

      {a.biography && (
        <Box sx={{ mt: 2.5 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="overline" color="text.secondary">
            About
          </Typography>
          <Typography
            color="text.secondary"
            sx={{
              mt: 0.5,
              p: 2,
              borderRadius: 2,
              bgcolor: (t) => alpha(t.palette.secondary.main, 0.08),
              borderLeft: (t) => `3px solid ${t.palette.secondary.main}`,
            }}
          >
            {a.biography}
          </Typography>
        </Box>
      )}
    </SectionCard>
  );
}
