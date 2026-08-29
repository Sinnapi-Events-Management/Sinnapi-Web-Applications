import { FileUpload, type UploadedFile } from '@sinnapi/ui';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import VideoLibraryOutlinedIcon from '@mui/icons-material/VideoLibraryOutlined';
import {
  IMAGE_ACCEPT,
  IMAGE_MAX_MB,
  VIDEO_ACCEPT,
  VIDEO_MAX_MB,
  type MediaType,
} from '../../schema';

type Props = {
  mediaType: MediaType;
  files: UploadedFile[];
  disabled: boolean;
  /** Null when the plan sets no cap; otherwise how many photos may still be added. */
  remaining: number | null;
  onSelect: (files: File[]) => void;
  onRemove: (id: string) => void;
};

/**
 * The drop target, configured for whichever media type is selected.
 *
 * Photos are multi-select and videos are not — a portfolio is built a batch of
 * photos at a time, while a 500 MB clip is a deliberate, one-at-a-time act, and
 * offering to queue six of them would be a trap on a hotel connection.
 *
 * The hint carries the real constraints, including how many photos are left on
 * the plan, because the limit is enforced by a database trigger the vendor never
 * sees: better to say "4 left" before they select twelve than to refuse eight of
 * them afterwards.
 */
export default function MediaDropzone({
  mediaType,
  files,
  disabled,
  remaining,
  onSelect,
  onRemove,
}: Props) {
  const isImage = mediaType === 'image';

  const allowance =
    isImage && remaining !== null
      ? ` · ${remaining} ${remaining === 1 ? 'photo' : 'photos'} left on your plan`
      : '';

  return (
    <FileUpload
      accept={isImage ? IMAGE_ACCEPT : VIDEO_ACCEPT}
      multiple={isImage}
      // Client-side ceiling only; the file is re-encoded well below the bucket's
      // own limit before it is ever sent.
      maxSizeMb={isImage ? IMAGE_MAX_MB : VIDEO_MAX_MB}
      disabled={disabled}
      value={files}
      onSelect={onSelect}
      onRemove={onRemove}
      icon={isImage ? <PhotoLibraryOutlinedIcon /> : <VideoLibraryOutlinedIcon />}
      hint={
        isImage
          ? `JPG, PNG, WebP, AVIF or HEIC · up to ${IMAGE_MAX_MB} MB each${allowance}`
          : `MP4, WebM or MOV · up to ${VIDEO_MAX_MB} MB`
      }
    />
  );
}
