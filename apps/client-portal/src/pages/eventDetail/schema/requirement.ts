import { z } from 'zod';
import { optionalAmountField } from '@/lib/schema';
import type { EventRequirementModel } from '@/lib/types';

/**
 * One budget line, as the form edits it.
 *
 * Every field is a string, like every other form in this app: that is what an
 * input yields, and it keeps the resolver's input and output types identical.
 * `toRequirementArgs` puts the amount back to a number on the way out.
 *
 * THE ALLOCATION IS OPTIONAL AND STAYS OPTIONAL. A client adding "Decor" before
 * they have any idea what decor costs is doing exactly what this list is for,
 * and a required figure would make them invent one — which is worse than no
 * figure, because the meters would then price the plan against a guess and
 * report it with the same confidence as a real number.
 */
export const requirementSchema = z.object({
  category_id: z.string().uuid('Choose what kind of service you need.'),
  title: z.string().trim().max(120, 'Label must be 120 characters or fewer.'),
  brief: z.string().trim().max(2000, 'Brief must be 2000 characters or fewer.'),
  // Mirrors `save_event_requirement`'s own bounds so the message lands on the
  // field rather than arriving as an RPC error the client cannot act on.
  allocated_amount: optionalAmountField('The amount')
    .refine((v) => v === '' || Number(v) < 1e12, 'That amount is too large.')
    .refine(
      (v) => v === '' || /^\d{1,12}(\.\d{1,2})?$/.test(v.trim()),
      'The amount can have at most two decimal places.',
    ),
  priority: z.enum(['must_have', 'nice_to_have']),
});

export type RequirementValues = z.infer<typeof requirementSchema>;

export const BLANK_REQUIREMENT: RequirementValues = {
  category_id: '',
  title: '',
  brief: '',
  allocated_amount: '',
  priority: 'must_have',
};

/** Projects a stored line onto the form's all-strings shape. */
export function requirementValues(row: EventRequirementModel): RequirementValues {
  return {
    category_id: row.category_id,
    title: row.title ?? '',
    brief: row.brief ?? '',
    allocated_amount: row.allocated_amount != null ? String(row.allocated_amount) : '',
    priority: row.priority,
  };
}

/**
 * The RPC arguments for a line.
 *
 * Blanks collapse to null rather than to empty strings or zero, so "I have not
 * said" and "I have decided it is free" stay different answers — the first
 * leaves the line unpriced and the second would claim a zero allocation the
 * meters would then draw as fully spent.
 */
export function toRequirementArgs(values: RequirementValues, requirementId?: string | null) {
  const text = (s: string) => (s.trim() === '' ? null : s.trim());
  return {
    requirementId: requirementId ?? null,
    categoryId: values.category_id,
    title: text(values.title),
    brief: text(values.brief),
    allocatedAmount: values.allocated_amount.trim() === '' ? null : Number(values.allocated_amount),
    priority: values.priority,
  };
}
