import { Box, Stack, Typography, Rating, Paper, Avatar, Divider } from '@sinnapi/ui/atoms';
import { Person, FormatQuote } from '@mui/icons-material';
import { withAlpha, palette } from '@sinnapi/ui/tokens';
import type { PublicReview } from '@/lib/types';

/**
 * One published review.
 *
 * Attribution is deliberately neutral — the public review model carries no
 * author identity — so the card says "Verified client" and dates it, which is
 * the part a reader can actually weigh.
 */
export default function ReviewCard({ review }: { review: PublicReview }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar
          sx={{ bgcolor: withAlpha(palette.light.primary.main, 0.12), color: 'primary.main' }}
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
            sx={{ fontSize: 18, color: 'secondary.main', transform: 'scaleX(-1)', mt: 0.25 }}
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
  );
}
