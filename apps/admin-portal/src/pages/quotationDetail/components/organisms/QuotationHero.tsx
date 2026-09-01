import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, HeroSurface, Stack, StatusChip, Typography } from '@sinnapi/ui';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import type { QuotationPricing } from '@sinnapi/ui';
import type { AdminQuotationDetailModel } from '@/lib/types';
import QuotationHeroMeta from '../molecules/QuotationHeroMeta';

type Props = {
  quotation: AdminQuotationDetailModel;
  pricing: QuotationPricing;
  isLapsed: boolean;
};

/**
 * Banner header: which quotation this is, where it stands, and who it is
 * between.
 *
 * The lapsed note sits here rather than in a section because it contradicts the
 * status chip immediately beside it — a quote can still read `sent` after its
 * valid-until date has passed, and an operator told "the client says they can't
 * accept it" needs that reconciled at the top of the page, not four rows into a
 * card.
 *
 * Sized down on a phone, where the banner is followed by a four-tab bar before
 * any content begins. The facts strip condenses to the money alone — see
 * `QuotationHeroMeta`.
 */
export default function QuotationHero({ quotation: q, pricing, isLapsed }: Props) {
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
            >
              Quotation {q.reference_no ?? '—'}
            </Typography>
            <StatusChip status={q.status} size="medium" />
          </Stack>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.25 }}>
            {q.vendor.name ?? 'Vendor'} · {q.client.name ?? 'Client'}
          </Typography>
        </Box>

        <Button
          component={RouterLink}
          to="/quotations"
          variant="text"
          color="inherit"
          startIcon={<ArrowBackIcon />}
          sx={{ flexShrink: 0 }}
        >
          All quotations
        </Button>
      </Stack>

      {isLapsed && (
        <Alert severity="info" sx={{ mt: 2 }}>
          This quote is past its valid-until date, so the client can no longer accept it — whatever
          the status still says.
        </Alert>
      )}

      <QuotationHeroMeta quotation={q} pricing={pricing} />
    </HeroSurface>
  );
}
