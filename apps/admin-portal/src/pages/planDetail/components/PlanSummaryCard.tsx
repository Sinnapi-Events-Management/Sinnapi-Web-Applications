import { Box, Card, CardContent, Divider, Stack, Typography } from '@sinnapi/ui';
import { formatDate, formatMoney, titleize } from '@/lib/config';
import type { PlanDetailModel } from '@/lib/types';

type Props = { plan: PlanDetailModel };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="baseline">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  );
}

/** At-a-glance plan metadata — the reference panel beside the feature card. */
export default function PlanSummaryCard({ plan }: Props) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Plan details
        </Typography>

        <Stack spacing={1.5} divider={<Divider flexItem />}>
          <Row label="Key" value={plan.key} />
          <Row label="Billing cycle" value={titleize(plan.billing_cycle)} />
          <Row label="Price" value={formatMoney(plan.price, plan.currency)} />
          <Row label="Currency" value={plan.currency ?? '—'} />
          <Row label="Trial" value={plan.trial_days ? `${plan.trial_days} days` : 'None'} />
          <Row label="Sort order" value={plan.sort_order} />
          <Row label="Status" value={plan.is_active ? 'Active' : 'Inactive'} />
          <Row label="Created" value={formatDate(plan.created_at)} />
          <Row label="Updated" value={formatDate(plan.updated_at)} />
        </Stack>

        {plan.description && (
          <Box sx={{ mt: 2.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Description
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {plan.description}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
