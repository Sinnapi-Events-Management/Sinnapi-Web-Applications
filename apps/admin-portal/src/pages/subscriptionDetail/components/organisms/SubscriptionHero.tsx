import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, HeroSurface, Stack, StatusChip, Typography } from '@sinnapi/ui';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import type { SubscriptionAdminDetailModel } from '@/lib/types';
import SubscriptionHeroMeta from '../molecules/SubscriptionHeroMeta';

type Props = { subscription: SubscriptionAdminDetailModel };

/**
 * Banner header: whose subscription, where it stands, and the facts that
 * decide what Finance does next.
 *
 * The vendor's name leads because a subscription has no reference of its
 * own — it is known by the business it keeps listed — and the status chip
 * sits beside it because "is this vendor visible" is the question that
 * opened the page.
 */
export default function SubscriptionHero({ subscription: s }: Props) {
  return (
    <HeroSurface>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{ position: 'relative', minWidth: 0 }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{ lineHeight: 1.15, fontSize: { xs: '1.375rem', sm: '2.125rem' } }}
              noWrap
            >
              {s.vendor.business_name ?? 'Vendor'}
            </Typography>
            <StatusChip status={s.status} size="medium" />
          </Stack>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.25 }}>
            {s.plan ? `${s.plan.name} plan` : 'No plan yet'} · listing{' '}
            {s.vendor.visibility === 'public' ? 'visible' : 'hidden'}
          </Typography>
        </Box>

        <Button
          component={RouterLink}
          to="/subscriptions"
          variant="text"
          color="inherit"
          startIcon={<ArrowBackIcon />}
          sx={{ flexShrink: 0 }}
        >
          All subscriptions
        </Button>
      </Stack>

      <SubscriptionHeroMeta subscription={s} />
    </HeroSurface>
  );
}
