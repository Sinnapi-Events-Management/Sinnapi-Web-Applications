import { Link as RouterLink } from 'react-router-dom';
import {
  Avatar,
  Box,
  Stack,
  Typography,
  Link,
  StatusChip,
  HeroSurface,
  heroAvatarSx,
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
 *
 * Sized down on a phone: a smaller avatar and an `h5`-scale reference, because
 * this banner is now followed by a response bar and a tab bar before any
 * content begins, and at `h4` on a 360px screen the reference wrapped onto two
 * lines before the status chip had anywhere to sit. The facts strip condenses
 * to the money alone — see `QuotationHeroMeta`.
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
          sx={{
            ...heroAvatarSx,
            width: { xs: 44, sm: 56 },
            height: { xs: 44, sm: 56 },
            flexShrink: 0,
          }}
        >
          {name.charAt(0)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{ lineHeight: 1.15, fontSize: { xs: '1.375rem', sm: '2.125rem' } }}
            >
              Quote {q.reference_no}
            </Typography>
            <StatusChip status={q.status} size="medium" />
          </Stack>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.25 }} noWrap>
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

      <QuotationHeroMeta quotation={q} event={event} pricing={pricing} />
    </HeroSurface>
  );
}
