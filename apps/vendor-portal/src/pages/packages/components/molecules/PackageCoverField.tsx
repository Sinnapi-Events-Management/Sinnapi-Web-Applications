import { useController, type Control } from 'react-hook-form';
import { CoverImageField } from '@sinnapi/ui/media';
import { COVER_ACCEPT } from '@/lib/packageCover';
import { usePackageCover } from '../../hooks/usePackageCover';
import type { PackageFormValues } from '../../schema';

type Props = {
  vendorId: string;
  control: Control<PackageFormValues>;
};

/**
 * The photograph across the top of the package card.
 *
 * An adapter and nothing else: the band, the picker and the two colour modes
 * live in the shared `CoverImageField`, the upload lives in `usePackageCover`,
 * and what is left here is the wiring between them and one form field.
 *
 * Bound with `useController` from a component body rather than a `Controller`
 * render prop in the parent form. The value is produced by an upload, not
 * typed, so the field owns the picking and react-hook-form only ever sees the
 * resulting URL — and binding it here keeps the editor form from re-rendering
 * the whole cover subtree on every unrelated keystroke.
 */
export default function PackageCoverField({ vendorId, control }: Props) {
  const { field } = useController({ name: 'cover_image_url', control });
  const cover = usePackageCover(vendorId, field.onChange);

  return (
    <CoverImageField
      label="Cover image"
      hint="Optional. A wide photo of this package delivered — it is the first thing a client sees."
      value={field.value ?? ''}
      preview={cover.preview}
      busy={cover.busy}
      error={cover.error}
      accept={COVER_ACCEPT}
      emptyLabel="No cover yet — click to add one"
      uploadLabel="Upload image"
      replaceLabel="Replace image"
      removeLabel="Remove cover image"
      onPick={cover.upload}
      onClear={cover.clear}
    />
  );
}
