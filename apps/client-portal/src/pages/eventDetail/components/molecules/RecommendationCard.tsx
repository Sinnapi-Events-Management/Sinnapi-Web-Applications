import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Rating,
  Stack,
  Tooltip,
  Typography,
  formatAmount,
} from '@sinnapi/ui';
import { AppLink } from '@sinnapi/ui/router';
import StarIcon from '@mui/icons-material/Star';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import CheckIcon from '@mui/icons-material/Check';
import type { VendorRecommendationModel } from '@/lib/types';

type Props = {
  row: VendorRecommendationModel;
  eventCurrency: string;
  invited: boolean;
  busy: boolean;
  onInvite: (row: VendorRecommendationModel) => void;
};

/**
 * A vendor the platform is suggesting, and why they may or may not fit.
 *
 * THE MISMATCHES ARE ON THE CARD, not hidden behind a filter. A vendor who is
 * busy on the date or works elsewhere still appears — labelled — because the
 * client is the one who knows whether a date can move or a caterer will
 * travel. Removing them silently would make the panel look confidently wrong;
 * saying so makes it useful.
 *
 * "FEATURED" IS LABELLED AS A PAID PLACEMENT and not dressed as an
 * endorsement. `is_featured` is the largest single term in the ranking and it
 * is something a vendor buys, so the client is told which vendors are there
 * because they paid to be. A recommendation panel that hides its commercial
 * incentive is the one people learn to distrust.
 */
export default function RecommendationCard({ row, eventCurrency, invited, busy, onInvite }: Props) {
  const showsConverted =
    row.from_currency != null &&
    row.from_currency !== eventCurrency &&
    row.from_amount_in_event_currency != null;

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Avatar src={row.primary_image_url ?? undefined} sx={{ width: 44, height: 44 }}>
          {row.business_name.charAt(0)}
        </Avatar>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            {row.slug ? (
              <AppLink to={`/discover/vendors/${row.slug}`} color="text.primary">
                {row.business_name}
              </AppLink>
            ) : (
              row.business_name
            )}
          </Typography>

          <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
            {row.review_count != null && row.review_count > 0 ? (
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
            ) : (
              <Typography variant="caption" color="text.secondary">
                No reviews yet
              </Typography>
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

        {row.is_featured && (
          <Tooltip title="A paid placement — this vendor pays to be featured on Sinnapi">
            <Chip size="small" color="secondary" variant="outlined" label="Promoted" />
          </Tooltip>
        )}
      </Stack>

      <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: 'wrap' }} useFlexGap>
        {row.from_amount != null ? (
          <Chip
            size="small"
            variant="outlined"
            icon={<PaymentsOutlinedIcon />}
            label={
              showsConverted
                ? `From ${formatAmount(row.from_amount, row.from_currency ?? undefined)} (≈ ${formatAmount(
                    row.from_amount_in_event_currency,
                    eventCurrency,
                  )})`
                : `From ${formatAmount(row.from_amount, row.from_currency ?? undefined)}`
            }
          />
        ) : (
          <Chip size="small" variant="outlined" label="Price on request" />
        )}

        {/* Only the mismatches are called out. A card listing everything a
            vendor DOES satisfy is three green ticks of noise on every row. */}
        {!row.is_available && (
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            icon={<EventBusyOutlinedIcon />}
            label="Busy on your date"
          />
        )}
        {!row.covers_region && <Chip size="small" variant="outlined" label="Based elsewhere" />}
        {!row.fits_budget && (
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            label="Over your remaining budget"
          />
        )}
      </Stack>

      {row.biography && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 1.25,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {row.biography}
        </Typography>
      )}

      {/* `mt: auto` pins the action to the bottom, so a row of cards with
          biographies of different lengths still has its buttons on one line. */}
      <Stack direction="row" spacing={1} sx={{ mt: 'auto', pt: 2 }}>
        <Button
          size="small"
          variant={invited ? 'text' : 'contained'}
          disabled={invited || busy}
          onClick={() => onInvite(row)}
          startIcon={
            busy ? (
              <CircularProgress size={14} color="inherit" />
            ) : invited ? (
              <CheckIcon />
            ) : undefined
          }
        >
          {invited ? 'Invited' : 'Invite to quote'}
        </Button>
      </Stack>
    </Box>
  );
}
