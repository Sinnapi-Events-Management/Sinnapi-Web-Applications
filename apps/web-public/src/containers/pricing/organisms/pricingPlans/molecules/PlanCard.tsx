import NextLink from 'next/link';
import { Box, Button, Chip, Paper, Stack, Typography } from '@sinnapi/ui/atoms';
import { List, ListItem, ListItemIcon, ListItemText } from '@sinnapi/ui/molecules';
import { Check as CheckIcon } from '@mui/icons-material';
import { withAlpha, palette } from '@sinnapi/ui/tokens';
import { formatPrice, type BillingCycle, type Plan } from '../data/plans';

type PlanCardProps = {
  plan: Plan;
  cycle: BillingCycle;
};

/**
 * A single subscription tier. The popular plan is lifted (raised, primary-bordered,
 * badged) so the eye lands on it first; all cards stretch to equal height so the
 * CTAs line up regardless of feature-list length.
 */
export default function PlanCard({ plan, cycle }: PlanCardProps) {
  const { highlight } = plan;
  const price = cycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;

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
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, minHeight: 40 }}>
        {plan.tagline}
      </Typography>

      <Stack direction="row" alignItems="baseline" spacing={0.75} sx={{ mt: 2.5 }}>
        <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1 }}>
          {formatPrice(price)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          /mo
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        {cycle === 'annual' ? 'Billed annually' : 'Billed monthly'}
      </Typography>

      <Button
        component={NextLink}
        href="/apply"
        variant={highlight ? 'contained' : 'outlined'}
        fullWidth
        size="large"
        sx={{ mt: 3 }}
      >
        Start free trial
      </Button>

      <List sx={{ flex: 1, mt: 1.5 }}>
        {plan.features.map((f) => (
          <ListItem key={f} disableGutters sx={{ py: 0.25, alignItems: 'flex-start' }}>
            <ListItemIcon sx={{ minWidth: 30, mt: 0.5 }}>
              <CheckIcon color="primary" fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={f} primaryTypographyProps={{ variant: 'body2' }} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
