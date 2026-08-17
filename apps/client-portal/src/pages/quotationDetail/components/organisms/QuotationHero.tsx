import { Link as RouterLink } from 'react-router-dom';
import {
  Avatar,
  Box,
  Divider,
  Stack,
  Typography,
  Link,
  StatusChip,
  HeroSurface,
  heroAvatarSx,
  heroDividerSx,
} from '@sinnapi/ui';
import type { QuotationPricing } from '@sinnapi/ui';
import type { EventRefModel, QuotationDetailModel, VendorRefModel } from '@/lib/types';
import QuotationHeroMeta from '../molecules/QuotationHeroMeta';

type Props = {
  quotation: QuotationDetailModel;
  vendor: VendorRefModel | null;
  event: EventRefModel | null;
  pricing: QuotationPricing;
};

/**
 * Banner header: whose quote this is, what it is called, where it stands, and
 * the handful of facts worth reading at a glance. The vendor name links through
 * to their profile when we hold a slug — comparing a price against what the
 * vendor actually offers is the obvious next click.
 */
export default function QuotationHero({ quotation: q, vendor, event, pricing }: Props) {
  const name = vendor?.business_name ?? 'Vendor';

  return (
    <HeroSurface>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{ position: 'relative', minWidth: 0 }}
      >
        <Avatar
          src={vendor?.primary_image_url ?? undefined}
          sx={{ ...heroAvatarSx, width: 56, height: 56 }}
        >
          {name.charAt(0)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.15 }}>
              Quote {q.reference_no}
            </Typography>
            <StatusChip status={q.status} size="medium" />
          </Stack>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.25 }}>
            {vendor?.slug ? (
              <Link
                component={RouterLink}
                to={`/discover/vendors/${vendor.slug}`}
                color="inherit"
                underline="hover"
              >
                {name}
              </Link>
            ) : (
              name
            )}
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ my: 2.5, ...heroDividerSx }} />

      <Box sx={{ position: 'relative' }}>
        <QuotationHeroMeta quotation={q} event={event} pricing={pricing} />
      </Box>
    </HeroSurface>
  );
}
