import { useController, type Control } from 'react-hook-form';
import { CoverImageField } from '@sinnapi/ui/media';
import { COVER_ACCEPT } from '@/lib/packageCover';
import { usePromotionBanner } from '../../hooks/usePromotionBanner';
import type { PromotionFormValues } from '../../schema';

type Props = {
  vendorId: string;
  control: Control<PromotionFormValues>;
};

/**
 * The artwork across the top of a campaign card.
 *
 * The same adapter shape as the package cover, over the same shared field and
 * the same uploader — the two surfaces differ only in their wording and the
 * storage folder they land in, and that is the only difference that should
 * ever need maintaining.
 */
export default function PromotionBannerField({ vendorId, control }: Props) {
  const { field } = useController({ name: 'banner_url', control });
  const banner = usePromotionBanner(vendorId, field.onChange);

  return (
    <CoverImageField
      label="Banner"
      hint="Optional. A wide image for this campaign — it is the first thing a client sees."
      value={field.value ?? ''}
      preview={banner.preview}
      busy={banner.busy}
      error={banner.error}
      accept={COVER_ACCEPT}
      emptyLabel="No banner yet — click to add one"
      uploadLabel="Upload banner"
      replaceLabel="Replace banner"
      removeLabel="Remove banner"
      onPick={banner.upload}
      onClear={banner.clear}
    />
  );
}
