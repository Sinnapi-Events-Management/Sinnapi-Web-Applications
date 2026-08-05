import { z } from 'zod';

export const templateFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Template name must be at least 3 characters.')
    .max(120, 'Template name must be 120 characters or fewer.'),
  notes: z.string().trim().max(2000, 'Notes must be 2000 characters or fewer.'),
});

export type TemplateFormValues = z.infer<typeof templateFormSchema>;

export const emptyTemplateValues: TemplateFormValues = { name: '', notes: '' };

/** The `quote_templates` row for a new template. */
export function toTemplateInsert(values: TemplateFormValues, vendorId: string) {
  return {
    vendor_id: vendorId,
    name: values.name.trim(),
    notes: values.notes.trim() || null,
    currency: 'UGX',
    is_active: true,
  };
}
