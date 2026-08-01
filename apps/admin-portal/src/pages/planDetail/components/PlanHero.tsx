import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Chip, Divider, Stack, Typography } from '@sinnapi/ui';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StarIcon from '@mui/icons-material/Star';
import HeroSurface from '@/components/ui/HeroSurface';
import {
  heroGhostSx,
  heroChipSx,
  heroDividerSx,
  heroDangerSx,
} from '@/components/ui/heroSurface.styles';
import { formatMoney, titleize } from '@/lib/config';
import type { PlanDetailModel } from '@/lib/types';

type Props = {
  plan: PlanDetailModel;
  onEdit: () => void;
  onDelete: () => void;
};

const CYCLE_SUFFIX: Record<string, string> = { monthly: '/month', annual: '/year' };

/** Gradient header: plan identity, headline price and the primary actions. */
export default function PlanHero({ plan, onEdit, onDelete }: Props) {
  return (
    <HeroSurface>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={1}
        sx={{ position: 'relative', mb: 3 }}
      >
        <Button
          component={RouterLink}
          to="/pricing-plans"
          startIcon={<ArrowBackIcon />}
          size="small"
          sx={{ px: 3, ...heroGhostSx }}
        >
          Back to plans
        </Button>
        <Stack direction="row" spacing={1}>
          {/* The row's single fill — gold via the theme's default button color. */}
          <Button
            size="small"
            variant="contained"
            startIcon={<EditOutlinedIcon />}
            onClick={onEdit}
            sx={{ px: 3 }}
          >
            Edit
          </Button>
          <Button
            size="small"
            startIcon={<DeleteOutlineIcon />}
            onClick={onDelete}
            sx={heroDangerSx}
          >
            Delete
          </Button>
        </Stack>
      </Stack>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
        spacing={2}
        sx={{ position: 'relative' }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.15 }}>
              {plan.name}
            </Typography>
            {plan.highlight && (
              <Chip size="small" icon={<StarIcon />} label="Most popular" sx={heroChipSx} />
            )}
            <Chip
              size="small"
              label={plan.is_active ? 'Active' : 'Inactive'}
              sx={{
                ...heroChipSx,
                bgcolor: plan.is_active ? 'var(--hero-overlay-strong)' : 'var(--hero-overlay)',
                opacity: plan.is_active ? 1 : 0.7,
              }}
            />
          </Stack>
          {plan.tagline && (
            <Typography variant="body1" sx={{ mt: 1, opacity: 0.95 }}>
              {plan.tagline}
            </Typography>
          )}
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={plan.key} sx={{ ...heroChipSx, fontFamily: 'monospace' }} />
            <Chip size="small" label={titleize(plan.billing_cycle)} sx={heroChipSx} />
          </Stack>
        </Box>

        <Box sx={{ textAlign: { sm: 'right' }, flexShrink: 0 }}>
          <Typography variant="h3" fontWeight={800} sx={{ lineHeight: 1 }}>
            {formatMoney(plan.price, plan.currency)}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {CYCLE_SUFFIX[plan.billing_cycle] ?? ''}
            {plan.trial_days ? ` · ${plan.trial_days}-day trial` : ''}
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ mt: 3, ...heroDividerSx }} />
    </HeroSurface>
  );
}
