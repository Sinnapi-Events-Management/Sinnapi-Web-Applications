import { Grid, StatCard } from '@sinnapi/ui';
import GroupIcon from '@mui/icons-material/Group';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import type { PlanKpis } from '@/lib/types';

type Props = {
  kpis?: PlanKpis;
  trialDays: number | null;
};

/**
 * Subscriber KPI row for a plan. The first four tiles break the subscriber base
 * down by lifecycle stage (total, active, trialing, expired); the last shows
 * the plan's trial length. Laid out 5-up on desktop via a 10-column grid so the
 * row stays balanced.
 */
export default function PlanStats({ kpis, trialDays }: Props) {
  const cards = [
    { label: 'Subscribers', value: kpis?.subscribers, icon: <GroupIcon /> },
    { label: 'Active', value: kpis?.active, icon: <CheckCircleIcon /> },
    { label: 'Trialing', value: kpis?.trialing, icon: <HourglassEmptyIcon /> },
    { label: 'Expired', value: kpis?.expired, icon: <EventBusyIcon /> },
    {
      label: 'Trial period',
      value: trialDays ? `${trialDays} days` : 'None',
      icon: <EventAvailableIcon />,
    },
  ];

  return (
    <Grid container spacing={2} columns={{ xs: 2, sm: 6, md: 10 }} sx={{ mb: 3 }}>
      {cards.map((c) => (
        <Grid item xs={1} sm={2} md={2} key={c.label}>
          <StatCard label={c.label} value={c.value ?? '—'} icon={c.icon} />
        </Grid>
      ))}
    </Grid>
  );
}
