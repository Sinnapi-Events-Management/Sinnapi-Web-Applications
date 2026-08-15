import {
  Avatar,
  Box,
  Divider,
  Stack,
  Typography,
  StatusChip,
  HeroSurface,
  heroAvatarSx,
  heroDividerSx,
} from '@sinnapi/ui';
import type { EventRefModel, ProfileRel, QuotationDetailModel } from '@/lib/types';
import QuotationHeroMeta from '../molecules/QuotationHeroMeta';

type Props = {
  quotation: QuotationDetailModel;
  client: ProfileRel | null;
  event: EventRefModel | null;
  isPriced: boolean;
};

/**
 * Banner header: whose request this is, what it is called, where it stands, and
 * the handful of facts worth reading at a glance.
 *
 * The client's name is not a link. A vendor has no client profile page to reach
 * — the way to them is the message thread, which the actions column offers.
 */
export default function QuotationHero({ quotation: q, client, event, isPriced }: Props) {
  const name = client?.full_name ?? 'Client';

  return (
    <HeroSurface>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{ position: 'relative', minWidth: 0 }}
      >
        <Avatar sx={{ ...heroAvatarSx, width: 56, height: 56 }}>{name.charAt(0)}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.15 }}>
              Quote {q.reference_no}
            </Typography>
            <StatusChip status={q.status} size="medium" />
          </Stack>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.25 }}>
            {name}
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ my: 2.5, ...heroDividerSx }} />

      <Box sx={{ position: 'relative' }}>
        <QuotationHeroMeta quotation={q} event={event} isPriced={isPriced} />
      </Box>
    </HeroSurface>
  );
}
