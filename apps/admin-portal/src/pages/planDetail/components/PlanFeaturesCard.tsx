import { Box, Card, CardContent, Chip, Stack, Typography } from '@sinnapi/ui';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import type { PlanDetailModel } from '@/lib/types';

type Props = { plan: PlanDetailModel };

/**
 * The plan's feature checklist — the card shoppers actually read. A highlighted
 * plan gets a coloured top accent and a "Most popular" badge, per the modern
 * pricing-card convention (emphasise the recommended tier).
 */
export default function PlanFeaturesCard({ plan }: Props) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderColor: plan.highlight ? 'primary.main' : 'divider',
        borderWidth: plan.highlight ? 2 : 1,
        overflow: 'hidden',
      }}
    >
      {plan.highlight && <Box sx={{ height: 4, bgcolor: 'primary.main' }} />}
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>
            What’s included
          </Typography>
          {plan.highlight && (
            <Chip size="small" color="primary" icon={<StarIcon />} label="Most popular" />
          )}
        </Stack>

        {plan.features.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No features listed yet. Edit the plan to add the bullets shown on the pricing card.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {plan.features.map((feature, i) => (
              <Stack key={i} direction="row" spacing={1.25} alignItems="flex-start">
                <CheckCircleIcon fontSize="small" color="primary" sx={{ mt: 0.25 }} />
                <Typography variant="body2">{feature}</Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
