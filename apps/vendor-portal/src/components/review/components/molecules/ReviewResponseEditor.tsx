import { Stack, Button, Alert } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { useReviewResponseForm } from '../../hooks/useReviewResponseForm';

type Props = {
  reviewId: string;
  /** The current response, when the vendor is editing rather than writing. */
  existing?: string;
  onCancel: () => void;
  onSuccess: () => void;
};

/** The reply editor. Mounted only while open, so cancelling discards the draft. */
export default function ReviewResponseEditor({ reviewId, existing, onCancel, onSuccess }: Props) {
  const { control, error, busy, submit } = useReviewResponseForm(reviewId, existing, onSuccess);

  return (
    <Stack component="form" onSubmit={submit} noValidate spacing={1} sx={{ mt: 1 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <ControlledField
        name="body"
        control={control}
        label="Your response"
        placeholder="Write a response… (emoji welcome 🙂)"
        multiline
        minRows={2}
        autoFocus
      />
      <Stack direction="row" spacing={1}>
        <Button type="submit" size="small" variant="contained" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
        <Button size="small" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </Stack>
    </Stack>
  );
}
