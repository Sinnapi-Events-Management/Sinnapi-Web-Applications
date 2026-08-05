import { z } from 'zod';
import type { SelectOption } from '@sinnapi/ui/forms';

export const MEDIA_TYPES = ['image', 'video'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const MEDIA_TYPE_OPTIONS: SelectOption[] = [
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video (Pro/Elite)' },
];

export const mediaFormSchema = z.object({
  media_type: z.enum(MEDIA_TYPES, { errorMap: () => ({ message: 'Choose a media type.' }) }),
  url: z
    .string()
    .trim()
    .min(1, 'Media URL is required.')
    .url('Enter a full URL, e.g. https://example.com/photo.jpg.'),
  caption: z.string().trim().max(200, 'Caption must be 200 characters or fewer.'),
});

export type MediaFormValues = z.infer<typeof mediaFormSchema>;

export const emptyMediaValues: MediaFormValues = {
  media_type: 'image',
  url: '',
  caption: '',
};

/**
 * The `vendor_media` row for a new item. `storage_path` mirrors the URL for now
 * — real uploads land in Supabase Storage and will set the two independently.
 * The DB trigger enforces plan limits (Starter ≤10 images, video on Pro/Elite).
 */
export function toMediaInsert(values: MediaFormValues, vendorId: string) {
  const url = values.url.trim();
  return {
    vendor_id: vendorId,
    media_type: values.media_type,
    storage_path: url,
    url,
    caption: values.caption.trim() || null,
  };
}
