import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@sinnapi/ui';
import CheckIcon from '@mui/icons-material/Check';
import { formatMoney } from '@/lib/config';
import { featureLine } from '../../schema/planFeatures';
import type { PlanModel } from '@/lib/types';

type Props = {
  plan: PlanModel;
  /** The plan the vendor is on right now, if any. */
  isCurrent: boolean;
  highlight: boolean;
  actionLabel: string;
  onAction: () => void;
};

/**
 * One plan from the catalogue, with the action that opens its checkout.
 *
 * The button is never disabled for the current plan. A vendor on this plan is
 * the one who most needs to pay for it again, so the card says "Renew" rather
 * than going quiet; the confirmation that follows spells out that renewing
 * extends the period rather than restarting it.
 */
export default function PlanCard({ plan, isCurrent, highlight, actionLabel, onAction }: Props) {
  const features = plan.plan_features ?? [];

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderColor: isCurrent ? 'success.main' : highlight ? 'secondary.main' : 'divider',
        borderWidth: isCurrent || highlight ? 2 : 1,
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="h4">{plan.name}</Typography>
          {isCurrent && <Chip size="small" color="success" label="Your plan" />}
          {!isCurrent && highlight && <Chip size="small" color="secondary" label="Popular" />}
        </Box>
        <Typography variant="h5" sx={{ my: 1 }}>
          {formatMoney(plan.price, plan.currency)}
          <Typography component="span" variant="body2" color="text.secondary">
            /{plan.billing_cycle === 'annual' ? 'year' : 'month'}
          </Typography>
        </Typography>
        {plan.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {plan.description}
          </Typography>
        )}
        <List dense>
          {features
            .map((f) => ({ key: f.feature_key, line: featureLine(f.feature_key, f.value) }))
            .filter((f): f is { key: string; line: string } => !!f.line)
            .map((f) => (
              <ListItem key={f.key} disableGutters>
                <ListItemIcon sx={{ minWidth: 30 }}>
                  <CheckIcon color="secondary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={f.line} />
              </ListItem>
            ))}
        </List>
      </CardContent>
      <Box sx={{ p: 2 }}>
        {/* The plan you are on has no button here: "Renew" lives once, on the
            "Your subscription" card at the top — it used to appear twice. */}
        {isCurrent ? (
          <Typography
            variant="body2"
            color="success.main"
            fontWeight={700}
            sx={{ textAlign: 'center' }}
          >
            This is your plan
          </Typography>
        ) : (
          <Button
            fullWidth
            variant={highlight ? 'contained' : 'outlined'}
            onClick={onAction}
            sx={{ minHeight: 48 }}
          >
            {actionLabel}
          </Button>
        )}
      </Box>
    </Card>
  );
}
