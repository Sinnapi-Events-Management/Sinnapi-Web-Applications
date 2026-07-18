import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Chip, Divider, Stack, Typography, alpha } from '@sinnapi/ui';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StarIcon from '@mui/icons-material/Star';
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
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 4,
        p: { xs: 2.5, sm: 4 },
        mb: 3,
        color: 'common.white',
        background: (t) =>
          `linear-gradient(120deg, ${t.palette.secondary.dark} 0%, ${t.palette.secondary.main} 52%, ${t.palette.primary.dark} 128%)`,
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: -80,
          right: -60,
          width: 260,
          height: 260,
          borderRadius: '50%',
          bgcolor: alpha('#fff', 0.12),
          filter: 'blur(4px)',
        }}
      />

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
          sx={{
            color: 'common.white',
            bgcolor: alpha('#fff', 0.12),
            '&:hover': { bgcolor: alpha('#fff', 0.22) },
          }}
        >
          Back to plans
        </Button>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            startIcon={<EditOutlinedIcon />}
            onClick={onEdit}
            sx={{
              color: 'common.white',
              bgcolor: alpha('#fff', 0.12),
              '&:hover': { bgcolor: alpha('#fff', 0.22) },
            }}
          >
            Edit
          </Button>
          <Button
            size="small"
            startIcon={<DeleteOutlineIcon />}
            onClick={onDelete}
            sx={{
              color: 'common.white',
              bgcolor: alpha('#fff', 0.12),
              '&:hover': { bgcolor: alpha('#fff', 0.22) },
            }}
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
              <Chip
                size="small"
                icon={<StarIcon />}
                label="Most popular"
                sx={{
                  color: 'common.white',
                  bgcolor: alpha('#fff', 0.18),
                  '& .MuiChip-icon': { color: 'inherit' },
                }}
              />
            )}
            <Chip
              size="small"
              label={plan.is_active ? 'Active' : 'Inactive'}
              sx={{
                color: 'common.white',
                bgcolor: alpha('#fff', plan.is_active ? 0.24 : 0.1),
              }}
            />
          </Stack>
          {plan.tagline && (
            <Typography variant="body1" sx={{ mt: 1, opacity: 0.95 }}>
              {plan.tagline}
            </Typography>
          )}
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              label={plan.key}
              sx={{ color: 'common.white', bgcolor: alpha('#fff', 0.14), fontFamily: 'monospace' }}
            />
            <Chip
              size="small"
              label={titleize(plan.billing_cycle)}
              sx={{ color: 'common.white', bgcolor: alpha('#fff', 0.14) }}
            />
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

      <Divider sx={{ mt: 3, borderColor: alpha('#fff', 0.2) }} />
    </Box>
  );
}
