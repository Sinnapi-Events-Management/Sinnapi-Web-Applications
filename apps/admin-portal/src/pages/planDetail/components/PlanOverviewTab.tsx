import { Box, Grid, InfoCard, Stack, Typography } from '@sinnapi/ui';
import { formatDate, formatMoney, titleize } from '@/lib/config';
import type { PlanDetailModel } from '@/lib/types';
import SectionTitle from './SectionTitle';

type Props = { plan: PlanDetailModel };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{children ?? '—'}</Typography>
    </Stack>
  );
}

/**
 * Overview panel: the plan's positioning copy alongside its reference facts.
 * Same data the summary card carried, laid out as a label/value grid to match
 * the vendor detail overview.
 */
export default function PlanOverviewTab({ plan }: Props) {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={7}>
        <Stack spacing={3}>
          <InfoCard>
            <Stack spacing={2}>
              <SectionTitle>About this plan</SectionTitle>
              <Stack spacing={1.5}>
                {plan.tagline && (
                  <Typography variant="body1" fontWeight={600}>
                    {plan.tagline}
                  </Typography>
                )}
                <Typography
                  variant="body2"
                  color={plan.description ? 'text.primary' : 'text.secondary'}
                >
                  {plan.description || 'No description provided.'}
                </Typography>
              </Stack>
            </Stack>
          </InfoCard>

          <InfoCard>
            <Stack spacing={2}>
              <SectionTitle>Billing</SectionTitle>
              <Grid container spacing={2.5}>
                <Grid item xs={6}>
                  <Field label="Price">{formatMoney(plan.price, plan.currency)}</Field>
                </Grid>
                <Grid item xs={6}>
                  <Field label="Billing cycle">{titleize(plan.billing_cycle)}</Field>
                </Grid>
                <Grid item xs={6}>
                  <Field label="Currency">{plan.currency ?? '—'}</Field>
                </Grid>
                <Grid item xs={6}>
                  <Field label="Trial period">
                    {plan.trial_days ? `${plan.trial_days} days` : 'None'}
                  </Field>
                </Grid>
              </Grid>
            </Stack>
          </InfoCard>
        </Stack>
      </Grid>

      <Grid item xs={12} md={5}>
        <InfoCard>
          <Stack spacing={2}>
            <SectionTitle>Plan details</SectionTitle>
            <Grid container spacing={2.5}>
              <Grid item xs={6}>
                <Field label="Key">
                  <Box component="span" sx={{ fontFamily: 'monospace' }}>
                    {plan.key}
                  </Box>
                </Field>
              </Grid>
              <Grid item xs={6}>
                <Field label="Status">{plan.is_active ? 'Active' : 'Inactive'}</Field>
              </Grid>
              <Grid item xs={6}>
                <Field label="Sort order">{plan.sort_order}</Field>
              </Grid>
              <Grid item xs={6}>
                <Field label="Highlighted">{plan.highlight ? 'Yes' : 'No'}</Field>
              </Grid>
              <Grid item xs={6}>
                <Field label="Created">{formatDate(plan.created_at)}</Field>
              </Grid>
              <Grid item xs={6}>
                <Field label="Updated">{formatDate(plan.updated_at)}</Field>
              </Grid>
            </Grid>
          </Stack>
        </InfoCard>
      </Grid>
    </Grid>
  );
}
