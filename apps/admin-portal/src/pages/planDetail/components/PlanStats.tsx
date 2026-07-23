import { Box } from '@sinnapi/ui';
import GroupIcon from '@mui/icons-material/Group';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import type { PlanKpis } from '@/lib/types';
import PlanStatTile from './PlanStatTile';

type Props = {
  kpis?: PlanKpis;
  trialDays: number | null;
};

/**
 * Subscriber KPI strip for a plan. The first four tiles break the subscriber
 * base down by lifecycle stage — each carries a semantic tint (active = success,
 * trialing = info, expired = error) so the row reads at a glance; the last tile
 * shows the plan's trial length in brand gold. Laid out as a responsive metric
 * strip: five-up on desktop, wrapping to three then two on smaller screens.
 */
export default function PlanStats({ kpis, trialDays }: Props) {
  const cards = [
    {
      label: 'Subscribers',
      value: kpis?.subscribers,
      icon: <GroupIcon />,
      accent: 'primary' as const,
    },
    { label: 'Active', value: kpis?.active, icon: <CheckCircleIcon />, accent: 'success' as const },
    {
      label: 'Trialing',
      value: kpis?.trialing,
      icon: <HourglassEmptyIcon />,
      accent: 'info' as const,
    },
    { label: 'Expired', value: kpis?.expired, icon: <EventBusyIcon />, accent: 'error' as const },
    {
      label: 'Trial period',
      value: trialDays ? `${trialDays} days` : 'None',
      icon: <EventAvailableIcon />,
      accent: 'secondary' as const,
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        mb: 3,
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(5, 1fr)',
        },
      }}
    >
      {cards.map((c) => (
        <PlanStatTile
          key={c.label}
          label={c.label}
          value={c.value ?? '—'}
          icon={c.icon}
          accent={c.accent}
        />
      ))}
    </Box>
  );
}
