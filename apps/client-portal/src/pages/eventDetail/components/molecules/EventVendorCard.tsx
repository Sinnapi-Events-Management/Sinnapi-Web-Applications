import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Rating,
  Stack,
  StatusChip,
  Tooltip,
  Typography,
  formatAmount,
} from '@sinnapi/ui';
import { Link as RouterLink } from 'react-router-dom';
import { AppLink } from '@sinnapi/ui/router';
import StarIcon from '@mui/icons-material/Star';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import type { EventVendorModel } from '@/lib/types';
import VendorInterestChip from '../atoms/VendorInterestChip';

type Props = {
  row: EventVendorModel;
  onShortlist: (row: EventVendorModel) => void;
  onDecline: (row: EventVendorModel) => void;
  onAccept: (row: EventVendorModel) => void;
  /** Comparison selection. Absent while there is nothing to compare against. */
  compare?: {
    selected: boolean;
    /** The cap is reached and this card is not one of the chosen. */
    disabled: boolean;
    onToggle: (quotationId: string) => void;
  };
};

/**
 * One vendor engagement: who they are, what they have offered, and what the
 * client can do about it.
 *
 * THE PRICE IS SHOWN IN BOTH CURRENCIES WHEN THEY DIFFER. The vendor quoted a
 * number and the client budgets in another; showing only the converted figure
 * would misquote the vendor, and showing only the vendor's would leave the
 * client comparing 1,200 against 4,400,000. The vendor's own figure leads
 * because that is the number on the quote they will be held to.
 *
 * ACTIONS ARE DERIVED FROM STATE, NOT ALWAYS PRESENT. A quote that is still
 * `requested` has no price to accept; a declined vendor has nothing to
 * shortlist. Rendering a disabled button for each of those tells the client
 * something is available to them and then refuses — so the card simply shows
 * the moves that exist.
 */
export default function EventVendorCard({ row, onShortlist, onDecline, onAccept, compare }: Props) {
  const isDeclined = row.interest_status === 'declined' || row.interest_status === 'withdrawn';
  const isBooked = Boolean(row.booking_id);
  // Only a quote the vendor has actually sent carries a price to agree to.
  const canAccept = !isBooked && ['sent', 'revised'].includes(row.quotation_status ?? '');
  const canShortlist = !isDeclined && row.interest_status !== 'shortlisted';
  const differentCurrency =
    row.quotation_currency != null && row.quotation_currency !== row.event_currency;
  // Only a priced quote is comparable. A request with no figure on it has
  // nothing to put in a column.
  const comparable = Boolean(compare && row.quotation_id && (row.quotation_total ?? 0) > 0);

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2,
        border: 1,
        borderColor:
          compare?.selected || row.interest_status === 'shortlisted' ? 'secondary.main' : 'divider',
        opacity: isDeclined ? 0.6 : 1,
      }}
    >
      <Stack direction="row" spacing={2} alignItems="flex-start">
        {comparable && compare && (
          <Checkbox
            size="small"
            checked={compare.selected}
            disabled={compare.disabled}
            onChange={() => compare.onToggle(row.quotation_id as string)}
            // The card carries no visible label for this box, so it says what
            // it selects rather than announcing a bare checkbox.
            inputProps={{
              'aria-label': `Compare the quote from ${row.business_name}`,
            }}
            sx={{ ml: -1, mt: -0.5 }}
          />
        )}
        <Avatar src={row.primary_image_url ?? undefined} sx={{ width: 44, height: 44 }}>
          {row.business_name.charAt(0)}
        </Avatar>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 0 }}>
              {row.slug ? (
                <AppLink to={`/discover/vendors/${row.slug}`} color="text.primary">
                  {row.business_name}
                </AppLink>
              ) : (
                row.business_name
              )}
            </Typography>
            {row.is_featured && (
              <Tooltip title="A vendor Sinnapi features">
                <Chip size="small" color="secondary" variant="outlined" label="Featured" />
              </Tooltip>
            )}
          </Stack>

          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ mt: 0.25 }}
          >
            {row.review_count != null && row.review_count > 0 && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Rating
                  value={Number(row.avg_rating ?? 0)}
                  precision={0.1}
                  readOnly
                  size="small"
                  emptyIcon={<StarIcon fontSize="inherit" sx={{ opacity: 0.25 }} />}
                />
                <Typography variant="caption" color="text.secondary">
                  ({row.review_count})
                </Typography>
              </Stack>
            )}
            {row.base_city && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <PlaceOutlinedIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {row.base_city}
                </Typography>
              </Stack>
            )}
          </Stack>
        </Box>

        <Stack spacing={0.75} alignItems="flex-end" sx={{ flexShrink: 0 }}>
          <VendorInterestChip status={row.interest_status} />
          {row.quotation_status && <StatusChip status={row.quotation_status} />}
        </Stack>
      </Stack>

      {/* What they are quoting for, and what it costs. */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'baseline' }}
        spacing={{ xs: 0.5, sm: 2 }}
        sx={{ mt: 1.75 }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0 }}>
          {row.requirement_title ?? 'Not assigned to a line'}
        </Typography>

        {row.quotation_total != null && row.quotation_total > 0 ? (
          <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
            >
              {formatAmount(row.quotation_total, row.quotation_currency ?? undefined)}
            </Typography>
            {differentCurrency && (
              <Typography variant="caption" color="text.secondary">
                {row.amount_in_event_currency == null
                  ? `No rate to ${row.event_currency}`
                  : `≈ ${formatAmount(row.amount_in_event_currency, row.event_currency)}`}
              </Typography>
            )}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {row.quotation_id ? 'No price yet' : 'Has not quoted'}
          </Typography>
        )}
      </Stack>

      {row.interest_message && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
          “{row.interest_message}”
        </Typography>
      )}

      {isBooked && (
        <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 1.25 }}>
          Booked — {row.booking_status}
        </Typography>
      )}

      <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }} useFlexGap>
        {canAccept && (
          <Button size="small" variant="contained" onClick={() => onAccept(row)}>
            Accept price
          </Button>
        )}
        {/* `RouterLink`, not `AppLink`: AppLink is a styled MUI Link, and handing
            it to Button as its root nests one set of link styles inside another.
            Every other navigating Button in the portal does the same. */}
        {row.quotation_id && (
          <Button
            size="small"
            variant="outlined"
            component={RouterLink}
            to={`/quotations/${row.quotation_id}`}
          >
            View quote
          </Button>
        )}
        {canShortlist && (
          <Button size="small" variant="text" onClick={() => onShortlist(row)}>
            Shortlist
          </Button>
        )}
        {!isDeclined && (
          <Button size="small" variant="text" color="inherit" onClick={() => onDecline(row)}>
            Not this one
          </Button>
        )}
      </Stack>
    </Box>
  );
}
