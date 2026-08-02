import { useState } from 'react';
import { Button, Box, Typography } from '@sinnapi/ui';
import ReviewResponseEditor from './components/molecules/ReviewResponseEditor';

type Props = {
  reviewId: string;
  /** The vendor's existing public reply, if they have already responded. */
  existing?: string;
};

/**
 * A review's reply affordance: the published response, a prompt to write one,
 * or the editor. Only the open state lives here — the draft and its validation
 * belong to the editor, which unmounts with it.
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
      <Box sx={{ mt: 1, pl: 2, borderLeft: 2, borderColor: 'primary.light' }}>
        <Typography variant="caption" color="text.secondary">
          Your response
        </Typography>
        <Typography variant="body2">{existing}</Typography>
        <Button size="small" onClick={() => setOpen(true)} sx={{ mt: 0.5 }}>
          Edit response
        </Button>
      </Box>
    );

  return (
    <Button size="small" onClick={() => setOpen(true)} sx={{ mt: 1 }}>
      Respond
    </Button>
  );
}
