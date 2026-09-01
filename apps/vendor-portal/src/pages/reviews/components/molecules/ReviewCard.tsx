import { Card, CardContent, Divider, Stack, Typography } from '@sinnapi/ui';
import type { ReviewRow } from '../../schema';
import ReviewCardHeader from './ReviewCardHeader';
import ReviewResponse from './ReviewResponse';

/**
 * One review, read in the order a vendor triages it: who and how well, then
 * what they said, then what is owed back.
 *
 * A review still awaiting a reply carries a warning rule down its left edge.
 * That single mark is what turns a uniform stack into a queue — a vendor can
 * find the work by scanning the margin at any scroll speed, without reading a
 * chip on every card. Answered cards drop the rule entirely rather than getting
 * a second colour, so the page has exactly one thing shouting at a time.
 *
 * The rule is only drawn for a review clients can actually see. Chasing a reply
 * to a card that has been pulled from the public profile is work that changes
 * nothing, and marking it urgent would send the vendor to do it first.
 *
 * The body is `pre-wrap`: clients write in paragraphs, and collapsing their
 * line breaks turns a considered review into a wall the vendor skims past.
 */
export default function ReviewCard({ row }: { row: ReviewRow }) {
  const needsReply = row.reply === null && row.isPublic;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderLeft: needsReply ? 3 : undefined,
        borderLeftColor: needsReply ? 'warning.main' : undefined,
        // A review that is not on the public profile is legible but visibly out
        // of play — the same treatment paused codes and archived packages get,
        // so the portal's screens agree on what "not live" looks like.
        opacity: row.isPublic ? 1 : 0.75,
        transition: (theme) => theme.transitions.create(['border-color', 'box-shadow']),
        '&:hover': { boxShadow: 2 },
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
        <ReviewCardHeader row={row} />

        {(row.title || row.body) && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Stack spacing={0.75}>
              {row.title && (
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {row.title}
                </Typography>
              )}
              {row.body && (
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                  {row.body}
                </Typography>
              )}
            </Stack>
          </>
        )}

        <Stack>
          <ReviewResponse reviewId={row.id} existing={row.reply ?? undefined} />
        </Stack>
      </CardContent>
    </Card>
  );
}
