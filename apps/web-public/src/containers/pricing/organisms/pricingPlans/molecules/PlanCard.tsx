import NextLink from 'next/link';
import { Button, Chip, Paper, Typography } from '@sinnapi/ui/atoms';
import { List, ListItem, ListItemIcon, ListItemText } from '@sinnapi/ui/molecules';
import { Check as CheckIcon } from '@mui/icons-material';
import { withAlpha, palette } from '@sinnapi/ui/tokens';
import type { BillingCycle, PricingPlanModel } from '@/lib/types';
import { priceFor } from '../../../utils/planSummary';
import PlanPrice from './PlanPrice';

type PlanCardProps = {
  plan: PricingPlanModel;
  cycle: BillingCycle;
};

/**
 * A single subscription tier, rendered from the admin-managed catalogue. The
 * highlighted plan is lifted (raised, primary-bordered, badged) so the eye lands
 * on it first; all cards stretch to equal height so the CTAs line up regardless
 * of feature-list length.
 *
 * Presentational by design — it takes a plan and a cycle and renders them. Which
 * cycle is showing, and whether there is a catalogue at all, are decided above.
 */
export default function PlanCard({ plan, cycle }: PlanCardProps) {
  const { highlight } = plan;

  return (
    <Paper
      variant="outlined"
      sx={{
        position: 'relative',
        p: { xs: 3, md: 3.5 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        borderColor: highlight ? 'primary.main' : 'divider',
        borderWidth: highlight ? 2 : 1,
        boxShadow: highlight ? 8 : 0,
        bgcolor: highlight ? withAlpha(palette.light.primary.main, 0.04) : 'background.paper',
        transition: 'box-shadow .2s, transform .2s, border-color .2s',
        '&:hover': {
          boxShadow: highlight ? 10 : 4,
          transform: 'translateY(-4px)',
          borderColor: 'primary.main',
        },
      }}
    >
      {highlight && (
        <Chip
          color="primary"
          label="Most popular"
          size="small"
          sx={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontWeight: 700,
          }}
        />
      )}

      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {plan.name}
      </Typography>
      {/* Reserved height rather than a conditional: the tagline is optional in
          the admin form, and a plan without one must not pull its price up out
          of line with the cards beside it. */}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, minHeight: 40 }}>
        {plan.tagline ?? plan.description ?? ''}
      </Typography>

      <PlanPrice amount={priceFor(plan, cycle)} currency={plan.currency} cycle={cycle} />

      <Button
        component={NextLink}
        href="/apply"
        variant={highlight ? 'contained' : 'outlined'}
        fullWidth
        size="large"
        sx={{ mt: 3 }}
        // Three identical "Start free trial" buttons are indistinguishable to a
        // screen-reader user listing the page's links; the plan name is the
        // only thing that tells them apart.
        aria-label={`Start free trial on the ${plan.name} plan`}
      >
        Start free trial
      </Button>

      <List sx={{ flex: 1, mt: 1.5 }}>
        {plan.features.map((feature) => (
          <ListItem key={feature} disableGutters sx={{ py: 0.25, alignItems: 'flex-start' }}>
            <ListItemIcon sx={{ minWidth: 30, mt: 0.5 }}>
              <CheckIcon color="primary" fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={feature} primaryTypographyProps={{ variant: 'body2' }} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
