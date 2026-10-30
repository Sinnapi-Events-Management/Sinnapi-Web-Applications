'use client';
import { Avatar, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { RatingValue } from '../atoms/RatingValue';
import { VendorReplyNote } from './VendorReplyNote';
import { formatDay } from '../../molecules/datetime';
import type { VendorReview } from '../types';

export type ReviewListItemProps = {
  review: VendorReview;
  /** Shown above the reply. The vendor's own name, not "the vendor". */
  vendorName?: string | null;
  /** This is the reading client's own review, so it is labelled and editable. */
  isMine?: boolean;
  /** Whether the edit window is still open. Only consulted when `isMine`. */
  canEdit?: boolean;
  /** Opens the composer on this review. Required for the edit button to show. */
  onEdit?: () => void;
};

/**
 * One published review, with the vendor's reply underneath it.
 *
 * The reply is indented inside the same card rather than given a card of its
 * own, because a reply read apart from the review it answers is just a vendor
 * making a statement. Keeping them in one block is also what makes the edit
 * lock legible: the reply is visibly the thing that closed the review.
 *
 * THE CLIENT'S OWN REVIEW IS A ROW IN THIS LIST, NOT A PANEL ABOVE IT. It used
 * to be both — echoed in a card at the top of the tab *and* printed again among
 * the others — so a client scrolled past their own words to find their own
 * words. Here it is the same row as everybody else's, marked "Your rating" and
 * carrying the edit button, which is the only thing that makes it different.
 * That is also what lets the tab open on the reviews themselves.
 *
 * "Edited" is shown when the author corrected the review before the vendor
 * replied. Hiding that would let a review be quietly rewritten after people had
 * already read it, which is the same objection the lock exists to answer.
 */
export function ReviewListItem({
  review,
  vendorName,
  isMine = false,
  canEdit = false,
  onEdit,
}: ReviewListItemProps) {
  const hasReply = Boolean(review.reply_body);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        // The client's own row is tinted so it can be found without reading
        // any of the rows. Everyone else's stays plain.
        ...(isMine && { borderColor: 'secondary.main', bgcolor: 'action.hover' }),
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Avatar
          src={review.author_avatar ?? undefined}
          alt={review.author_name ?? 'A client'}
          sx={{ width: 40, height: 40 }}
        >
          {(review.author_name ?? 'A')[0]}
        </Avatar>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 0.25, sm: 1 }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2">
                {isMine ? 'Your rating' : (review.author_name ?? 'A client')}
              </Typography>
              {isMine && <Chip size="small" color="secondary" variant="outlined" label="You" />}
            </Stack>
            {/* Omitted rather than shown as an em dash: the client's own row
                can be pinned from the eligibility read, which carries the
                review but not the day it was written. */}
            {review.created_at && (
              <Typography variant="caption" color="text.secondary">
                {formatDay(review.created_at)}
                {review.edited_at ? ' · edited' : ''}
              </Typography>
            )}
          </Stack>

          <Box sx={{ mt: 0.5 }}>
            <RatingValue rating={review.rating} withLabel />
          </Box>

          {review.title && (
            <Typography variant="subtitle1" sx={{ mt: 1 }}>
              {review.title}
            </Typography>
          )}

          {review.body && (
            // `pre-line` so the paragraphs a client typed survive. Reviews are
            // written in a textarea and collapsing them into one block is how a
            // considered three-paragraph review reads as a rant.
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, whiteSpace: 'pre-line' }}
            >
              {review.body}
            </Typography>
          )}

          {hasReply && (
            <Box sx={{ mt: 1.5 }}>
              <VendorReplyNote
                body={review.reply_body}
                vendorName={vendorName}
                repliedAt={review.reply_at}
              />
            </Box>
          )}

          {/* Only ever on the client's own row. The locked case says so in four
              words rather than dropping the button silently — a control that
              vanishes reads as a broken screen, and the reply above it is
              already visible as the thing that closed the window. */}
          {isMine &&
            (canEdit && onEdit ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditOutlinedIcon />}
                onClick={onEdit}
                sx={{ mt: 1.25 }}
              >
                Change
              </Button>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Final — the vendor replied.
              </Typography>
            ))}
        </Box>
      </Stack>
    </Paper>
  );
}
