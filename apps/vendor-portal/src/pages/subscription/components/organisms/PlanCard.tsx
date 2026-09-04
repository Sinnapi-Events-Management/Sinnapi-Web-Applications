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
import { formatMoney, titleize } from '@/lib/config';
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
          {isCurrent && <Chip size="small" color="success" label="Current plan" />}
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
            .filter((f) => f.value !== false && f.value !== 'false')
            .map((f) => (
              <ListItem key={f.feature_key} disableGutters>
                <ListItemIcon sx={{ minWidth: 30 }}>
                  <CheckIcon color="secondary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={titleize(f.feature_key)} />
              </ListItem>
            ))}
        </List>
      </CardContent>
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant={highlight || isCurrent ? 'contained' : 'outlined'}
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      </Box>
    </Card>
  );
}
