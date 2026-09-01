import { Avatar, Rating, Stack, Tooltip, Typography } from '@sinnapi/ui';
import { formatDate, formatRelative } from '@/lib/config';
import type { ReviewRow } from '../../schema';
import ReplyStatusChip from '../atoms/ReplyStatusChip';
import ReviewVisibilityChip from '../atoms/ReviewVisibilityChip';

/** Two initials from a name, so a missing avatar is still identifiably a person. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Who left the review, what they scored, and where it stands.
 *
 * The score sits on the same line as the name at every width. It is the first
 * thing a vendor triages on, and pushing it under the name on narrow screens
 * would mean scanning a phone-width list by reading rather than glancing.
 *
 * The age is relative — "3 days ago" is how a vendor judges whether a reply is
 * still timely, where a calendar date makes them do the subtraction — with the
 * exact date one hover away for when they need to match it to a booking.
 *
 * The two chips wrap onto their own line below `sm` rather than compressing the
 * name: a truncated client name is a card the vendor cannot identify, which is
 * a worse trade than one extra row of height.
 */
export default function ReviewCardHeader({ row }: { row: ReviewRow }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'stretch', sm: 'flex-start' }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
        <Avatar
          src={row.avatarUrl ?? undefined}
          alt=""
          sx={{ width: 44, height: 44, flexShrink: 0, fontWeight: 700 }}
        >
          {initials(row.reviewer)}
        </Avatar>

        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>
            {row.reviewer}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Rating value={row.rating} readOnly size="small" />
            <Tooltip title={formatDate(row.createdAt)}>
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                {formatRelative(row.createdAt)}
              </Typography>
            </Tooltip>
          </Stack>
        </Stack>
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        flexWrap="wrap"
        useFlexGap
        sx={{ flexShrink: 0, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}
      >
        <ReviewVisibilityChip visibility={row.visibility} />
        <ReplyStatusChip replied={row.reply !== null} />
      </Stack>
    </Stack>
  );
}
