import { Alert, Box, Button, DialogActions, DialogContent, Stack } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import MediaTypeToggle from '../molecules/MediaTypeToggle';
import MediaSourceToggle from '../molecules/MediaSourceToggle';
import MediaDropzone from '../molecules/MediaDropzone';
import { useMediaForm } from '../../hooks/useMediaForm';
import type { PortfolioPlan } from '../../hooks/usePortfolioPlan';

type Props = {
  vendorId: string;
  plan: PortfolioPlan;
  nextSortOrder: number;
  needsCover: boolean;
  onCancel: () => void;
  onSuccess: () => void;
};

/**
 * The add-media fields and their write.
 *
 * Ordered the way the decisions actually depend on each other: the type governs
 * which formats and limits apply, the source governs which input is shown, and
 * the caption is last because it is the only optional part. All of the state and
 * the write live in `useMediaForm`, so this file is the arrangement and nothing
 * else.
 */
export default function MediaForm({
  vendorId,
  plan,
  nextSortOrder,
  needsCover,
  onCancel,
  onSuccess,
}: Props) {
  const { control, mediaType, source, error, upload, busy, changeType, changeSource, submit } =
    useMediaForm({ vendorId, nextSortOrder, needsCover, onSuccess });

  const isImage = mediaType === 'image';
  const blockedByPlan = isImage && plan.imagesExhausted;

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {blockedByPlan && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You have used all {plan.maxImages} photos on your{' '}
            {plan.planName ? `${plan.planName} ` : ''}plan. Remove one, or upgrade for more.
          </Alert>
        )}

        <Stack spacing={2.5}>
          <MediaTypeToggle
            value={mediaType}
            allowsVideo={plan.allowsVideo}
            disabled={busy}
            onChange={changeType}
          />

          <MediaSourceToggle value={source} disabled={busy} onChange={changeSource} />

          {source === 'upload' ? (
            <MediaDropzone
              mediaType={mediaType}
              files={upload.files}
              disabled={busy || blockedByPlan}
              remaining={plan.remaining}
              onSelect={upload.select}
              onRemove={upload.remove}
            />
          ) : (
            <ControlledField
              name="url"
              control={control}
              label="Media URL"
              helperText={
                isImage
                  ? 'A direct link to an image file.'
                  : 'A YouTube or Vimeo link, or a direct link to an MP4.'
              }
            />
          )}

          <ControlledField
            name="caption"
            control={control}
            label="Caption (optional)"
            helperText="Shown under the item on your public profile. Applied to everything you add now."
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={busy || blockedByPlan || (source === 'upload' && !upload.hasFiles)}
        >
          {busy ? 'Working…' : 'Add to portfolio'}
        </Button>
      </DialogActions>
    </Box>
  );
}
