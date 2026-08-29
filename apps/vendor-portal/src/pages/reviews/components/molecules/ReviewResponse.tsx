import { useState } from 'react';
import { alpha, Box, Button, Stack, Typography } from '@sinnapi/ui';
import ReplyOutlinedIcon from '@mui/icons-material/ReplyOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ReviewResponseEditor from './ReviewResponseEditor';

type Props = {
  reviewId: string;
  /** The vendor's existing public reply, if they have already responded. */
  existing?: string;
};

/**
 * A review's reply affordance: the published response, a prompt to write one,
 * or the editor.
 *
 * Only the open state lives here — the draft and its validation belong to the
 * editor, which unmounts with it, so cancelling discards rather than leaving a
 * half-written reply to reappear later.
 *
 * The published reply is quoted on its own tinted surface with a gold rule down
 * the side, because it is the one block on this card the vendor wrote. Without
 * that separation a two-line review and a two-line reply read as one paragraph
 * from the same person, which is exactly what a client scanning the public
 * profile must never do either.
 *
 * "Respond" is `contained` while nothing has been written and a quiet text
 * button once it has. The card is a work item until it is answered and a record
 * afterwards, and the weight of the button is what says which.
 */
export default function ReviewResponse({ reviewId, existing }: Props) {
  const [open, setOpen] = useState(false);

  if (open)
    return (
      <ReviewResponseEditor
        reviewId={reviewId}
        existing={existing}
        onCancel={() => setOpen(false)}
        onSuccess={() => setOpen(false)}
      />
    );

  if (existing)
    return (
      <Box
        sx={{
          mt: 2,
          p: { xs: 1.5, sm: 2 },
          borderRadius: 2,
          borderLeft: 3,
          borderColor: 'secondary.main',
          // Tinted from the accent rather than set to a fixed fill, so the
          // quote reads as the same soft wash on the light canvas and the warm
          // dark one instead of a grey block that only suits one of them.
          bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.07),
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1}
          sx={{ mb: 0.5 }}
        >
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ lineHeight: 1.4, fontWeight: 700 }}
          >
            Your response
          </Typography>
          <Button
            size="small"
            startIcon={<EditOutlinedIcon />}
            onClick={() => setOpen(true)}
            sx={{ flexShrink: 0 }}
          >
            Edit
          </Button>
        </Stack>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {existing}
        </Typography>
      </Box>
    );

  return (
    <Button
      size="small"
      variant="contained"
      startIcon={<ReplyOutlinedIcon />}
      onClick={() => setOpen(true)}
      // Full width on a phone so the one action on the card is a thumb-width
      // target rather than a chip in the corner.
      sx={{ mt: 2, alignSelf: 'flex-start', width: { xs: '100%', sm: 'auto' } }}
    >
      Respond
    </Button>
  );
}
