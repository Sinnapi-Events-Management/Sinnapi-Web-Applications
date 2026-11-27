import type { ReactNode } from 'react';
import {
  Avatar,
  Box,
  Button,
  HeroSurface,
  PdfDocumentActions,
  Stack,
  StatusChip,
  Typography,
  heroAvatarSx,
  type PdfDocumentState,
  type QuotationPricing,
} from '@sinnapi/ui';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PlaceIcon from '@mui/icons-material/Place';
import PhoneIcon from '@mui/icons-material/Phone';
import { formatDate, formatMoney } from '@/lib/config';
import { relativeDay } from '@/lib/bookingCopy';
import { requestSnippet } from '@/lib/quoteCopy';
import type { DirectoryProfile, EventRefModel, QuotationDetailModel } from '@/lib/types';

type Props = {
  quotation: QuotationDetailModel;
  client: DirectoryProfile | null;
  event: EventRefModel | null;
  pricing: QuotationPricing;
  pdf: PdfDocumentState;
};

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0 }}>
      <Box sx={{ color: 'text.secondary', display: 'flex', mt: '2px', '& svg': { fontSize: 18 } }}>
        {icon}
      </Box>
      <Typography variant="body1" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
        {children}
      </Typography>
    </Stack>
  );
}

/**
 * Who the quote is for, what they asked for, when and where the event is, and
 * the price — the same header shape as a booking. The quote code is kept,
 * small, for support; it used to be the headline.
 */
export default function QuotationHero({ quotation: q, client, event, pricing, pdf }: Props) {
  const name = client?.full_name ?? 'Client';
  const what = event?.title?.trim() || requestSnippet(q.request_details, 80);
  const date = q.event_date ?? event?.event_date ?? null;
  const when = relativeDay(date);
  const phone = client?.contact_visible ? client.phone : null;

  return (
    <HeroSurface>
      <Stack spacing={2} sx={{ position: 'relative', minWidth: 0 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar sx={{ ...heroAvatarSx, width: 48, height: 48 }}>{name.charAt(0)}</Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="h5"
              component="h1"
              fontWeight={700}
              sx={{ lineHeight: 1.2, overflowWrap: 'anywhere' }}
            >
              {name}
            </Typography>
            {what && (
              <Typography variant="body1" color="text.secondary" noWrap>
                {what}
              </Typography>
            )}
          </Box>
          <StatusChip status={q.status} size="medium" domain="quotation" />
        </Stack>

        {(date || q.event_address) && (
          <Stack spacing={1}>
            {date && (
              <Fact icon={<CalendarMonthIcon />}>
                {formatDate(date)}
                {when && (
                  <Box component="span" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {' · '}
                    {when}
                  </Box>
                )}
              </Fact>
            )}
            {q.event_address && <Fact icon={<PlaceIcon />}>{q.event_address}</Fact>}
          </Stack>
        )}

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ pt: 1.5, borderTop: 1, borderColor: 'divider' }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Your price
            </Typography>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{ fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}
            >
              {pricing.isPriced ? formatMoney(pricing.total, pricing.currency) : 'Not priced yet'}
            </Typography>
          </Box>
          {phone && (
            <Button
              href={`tel:${phone.replace(/\s+/g, '')}`}
              variant="outlined"
              startIcon={<PhoneIcon />}
              sx={{ minHeight: 44, flexShrink: 0 }}
            >
              Call
            </Button>
          )}
        </Stack>

        {pricing.isPriced && (
          // Tighter button padding: "Download PDF" otherwise touches the card
          // edge at 360px.
          <Box sx={{ '& .MuiButton-root': { px: 1.25, minHeight: 44 } }}>
            <PdfDocumentActions
              pdf={pdf}
              previewTitle={`Quotation ${q.reference_no ?? ''}`.trim()}
            />
          </Box>
        )}

        {q.reference_no && (
          <Typography variant="caption" color="text.secondary">
            Quote code {q.reference_no}
          </Typography>
        )}
      </Stack>
    </HeroSurface>
  );
}
