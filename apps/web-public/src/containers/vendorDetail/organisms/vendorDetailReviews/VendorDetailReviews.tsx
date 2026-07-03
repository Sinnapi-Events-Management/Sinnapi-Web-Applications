import { Box, Stack, Typography, Rating, Paper, Avatar, Divider } from '@sinnapi/ui/atoms';
import { Person, FormatQuote } from '@mui/icons-material';
import { withAlpha, palette } from '@sinnapi/ui/tokens';
import type { PublicReview, VendorDetailModel } from '@/lib/types';

/**
 * Reviews section — a rating summary header followed by individual review cards.
 * Reviews are anonymised (the public model carries no author identity), so each
 * card shows a neutral "Verified client" attribution with the date. Falls back to
 * an encouraging empty state when the vendor has no published reviews yet.
 */
export default function VendorDetailReviews({
  vendor,
  reviews,
}: {
  vendor: VendorDetailModel;
  reviews: PublicReview[];
}) {
  return (
    <Box sx={{ mt: { xs: 4, md: 5 } }}>
      <Typography variant="overline" color="primary">
        Reviews
      </Typography>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="baseline"
        sx={{ mt: 0.5, mb: 2.5, flexWrap: 'wrap' }}
      >
        <Typography variant="h4">What clients say</Typography>
        {vendor.review_count > 0 && (
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Rating value={vendor.avg_rating} precision={0.5} size="small" readOnly />
            <Typography variant="body2" color="text.secondary">
              {vendor.avg_rating.toFixed(1)} · {vendor.review_count} reviews
            </Typography>
          </Stack>
        )}
      </Stack>

      {reviews.length === 0 ? (
        <Typography color="text.secondary">
          No reviews yet — be the first to work with {vendor.business_name}.
        </Typography>
      ) : (
        <Stack spacing={2}>
          {reviews.map((review) => (
            <Paper
              key={review.id}
              variant="outlined"
              sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3 }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  sx={{
                    bgcolor: withAlpha(palette.light.primary.main, 0.12),
                    color: 'primary.main',
                  }}
                >
                  <Person />
                </Avatar>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2">Verified client</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(review.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Typography>
                </Box>
                <Rating value={review.rating} precision={0.5} size="small" readOnly />
              </Stack>

              {(review.title || review.body) && <Divider sx={{ my: 1.5 }} />}

              {review.title && (
                <Stack direction="row" spacing={0.5} alignItems="flex-start">
                  <FormatQuote
                    sx={{
                      fontSize: 18,
                      color: 'secondary.main',
                      transform: 'scaleX(-1)',
                      mt: 0.25,
                    }}
                  />
                  <Typography variant="subtitle1" fontWeight={700}>
                    {review.title}
                  </Typography>
                </Stack>
              )}
              {review.body && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: review.title ? 0.5 : 0, lineHeight: 1.7 }}
                >
                  {review.body}
                </Typography>
              )}
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}
