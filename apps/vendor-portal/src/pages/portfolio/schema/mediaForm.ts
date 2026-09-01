import { z } from 'zod';
import type { SelectOption } from '@sinnapi/ui/forms';

export const MEDIA_TYPES = ['image', 'video'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

/** How the bytes get here: uploaded from the device, or already on the web. */
export const MEDIA_SOURCES = ['upload', 'link'] as const;
export type MediaSourceMode = (typeof MEDIA_SOURCES)[number];

export const MEDIA_TYPE_OPTIONS: SelectOption[] = [
  { value: 'image', label: 'Photo' },
  { value: 'video', label: 'Video' },
];

/**
 * The add-media form.
 *
 * `url` is only required in link mode; in upload mode the picked files are the
 * input and they live outside the form (a `File` is not serialisable state, and
 * react-hook-form has no business holding one). The refinement is what keeps a
 * single schema honest across both modes rather than forking into two forms that
 * would drift.
 */
export const mediaFormSchema = z
  .object({
    media_type: z.enum(MEDIA_TYPES, { errorMap: () => ({ message: 'Choose a media type.' }) }),
    source: z.enum(MEDIA_SOURCES),
    url: z.string().trim(),
    caption: z.string().trim().max(200, 'Caption must be 200 characters or fewer.'),
  })
  .superRefine((values, ctx) => {
    if (values.source !== 'link') return;
    if (!values.url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['url'],
        message: 'Media URL is required.',
      });
      return;
    }
    if (!/^https?:\/\/\S+$/i.test(values.url)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['url'],
        message: 'Enter a full URL starting with https://',
      });
    }
  });

export type MediaFormValues = z.infer<typeof mediaFormSchema>;

export const emptyMediaValues: MediaFormValues = {
  media_type: 'image',
  source: 'upload',
  url: '',
  caption: '',
};

export type MediaInsertInput = {
  vendorId: string;
  mediaType: MediaType;
  /** The object key for an upload, or the URL itself for a pasted link. */
  storagePath: string;
  url: string;
  caption: string;
  /** Appended to the end of the vendor's curated order. */
  sortOrder: number;
  /** True only for the first image a vendor adds — see `useMediaActions`. */
  isPrimary: boolean;
};

/**
 * A `vendor_media` row.
 *
 * `storage_path` and `url` are set independently now that uploads are real: the
 * path is what a later cleanup deletes, the URL is what a browser loads. They
 * still coincide for a pasted link, where there is no object of ours to delete.
 * The DB trigger enforces plan limits on insert — see `mediaErrors` for what the
 * vendor is shown when it refuses.
 */
export function toMediaInsert(input: MediaInsertInput) {
  return {
    vendor_id: input.vendorId,
    media_type: input.mediaType,
    storage_path: input.storagePath,
    url: input.url,
    caption: input.caption.trim() || null,
    sort_order: input.sortOrder,
    is_primary: input.isPrimary,
  };
}
