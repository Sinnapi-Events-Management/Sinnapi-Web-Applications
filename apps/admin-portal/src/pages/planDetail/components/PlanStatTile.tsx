import { Card, CardContent, Stack, Typography } from '@sinnapi/ui';
import IconBadge from '@/components/ui/IconBadge';

type AccentColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

type Props = {
  label: React.ReactNode;
  value: React.ReactNode;
  icon: React.ReactNode;
  /** Semantic tint — the KPI's meaning carried in colour (active = success, etc.). */
  accent?: AccentColor;
};

/**
 * Metric tile for the plan KPI strip: label + big value with a tinted icon badge
 * whose colour signals the metric's lifecycle meaning. Local to the plan detail
 * so the shared StatCard stays a neutral primitive.
 */
export default function PlanStatTile({ label, value, icon, accent = 'primary' }: Props) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary" noWrap>
              {label}
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.1 }}>
              {value}
            </Typography>
          </Stack>
          <IconBadge accent={accent} size={40}>
            {icon}
          </IconBadge>
        </Stack>
      </CardContent>
    </Card>
  );
}
