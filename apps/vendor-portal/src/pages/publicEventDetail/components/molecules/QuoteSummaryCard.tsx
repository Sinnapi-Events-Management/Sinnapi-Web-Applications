import { Box, Chip, StatusChip, Stack, Typography } from '@sinnapi/ui';
import { AppLink } from '@sinnapi/ui/router';
import { formatDate, formatMoney } from '@/lib/config';
import type { PublicEventRequirementModel, VendorEventQuotationModel } from '@/lib/types';

type Props = {
  quotation: VendorEventQuotationModel;
  /** The plan line this quote answers, when it is against one. */
  requirement: PublicEventRequirementModel | null;
};

/**
 * One of this vendor's quotes for the event, as a row that opens it.
 *
 * The reference is the link and its `::after` stretches over the row, so the
 * whole surface opens the builder while exactly one link goes into the
 * accessibility tree, named by the reference rather than by the row's full
 * text. Same pattern as the feed's card, same reason.
 *
 * An unpriced quote shows no total rather than `UGX 0`. A draft that has never
 * been costed genuinely has no figure, and printing a zero in the row's largest
 * text says the vendor offered to work for nothing.
 *
 * The line the quote answers is named when it has one. A vendor may hold two
 * quotes on one event — the caterer who also does the cake — and without the
 * line the two rows are distinguishable only by a reference number.
 */
export default function QuoteSummaryCard({ quotation, requirement }: Props) {
  const priced = quotation.total != null && Number(quotation.total) > 0;

  return (
    <Box
      sx={{
        position: 'relative',
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        transition: (t) => t.transitions.create(['border-color', 'box-shadow']),
        '&:hover': { borderColor: 'secondary.main', boxShadow: 2 },
        '&:focus-within': {
          borderColor: 'secondary.main',
          outline: '2px solid',
          outlineColor: 'secondary.main',
          outlineOffset: 2,
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
      >
        <Stack spacing={0.75} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 0 }}>
              <AppLink
                to={`/quotations/${quotation.id}`}
                color="text.primary"
                sx={{ '&::after': { content: '""', position: 'absolute', inset: 0 } }}
              >
                {quotation.reference_no ?? 'Draft quote'}
              </AppLink>
            </Typography>
            <StatusChip status={quotation.status} />
          </Stack>

          {requirement && (
            <Chip
              size="small"
              variant="outlined"
              label={requirement.title ?? requirement.category_name}
              sx={{ alignSelf: 'flex-start', maxWidth: '100%' }}
            />
          )}

          <Typography variant="caption" color="text.secondary">
            {quotation.sent_at
              ? `Sent ${formatDate(quotation.sent_at)}`
              : `Opened ${formatDate(quotation.created_at)}`}
            {quotation.valid_until && ` · valid until ${formatDate(quotation.valid_until)}`}
          </Typography>
        </Stack>

        <Typography variant="h6" sx={{ flexShrink: 0 }}>
          {priced ? formatMoney(quotation.total, quotation.currency) : 'Not priced yet'}
        </Typography>
      </Stack>
    </Box>
  );
}
