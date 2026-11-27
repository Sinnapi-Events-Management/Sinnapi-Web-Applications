import type { FieldErrors, FieldValues } from 'react-hook-form';

/**
 * A step's validation errors as short sentences — "Item 2: price — Enter a
 * number." — for the "Please fix this first" box shown when Next is refused.
 * Form fields only show their own errors after a real submit (`useFieldError`),
 * and moving between steps is not one, so without this list Next silently did
 * nothing.
 *
 * `labels` maps a field name to the words the vendor sees for it; array
 * fields (`items`) are walked row by row with `itemLabels` for their columns.
 */
export function missingList<T extends FieldValues>(
  errors: FieldErrors<T>,
  fields: readonly string[],
  labels: Record<string, string>,
  itemLabels: Record<string, string> = {},
  itemNoun = 'Item',
): string[] {
  const out: string[] = [];
  const all = errors as Record<string, unknown>;
  for (const name of fields) {
    const e = all[name] as
      | ({ message?: string; root?: { message?: string } } & Record<string, unknown>)
      | unknown[]
      | undefined;
    if (!e) continue;
    if (Array.isArray(e)) {
      e.forEach((row, i) => {
        if (!row || typeof row !== 'object') return;
        for (const [col, err] of Object.entries(row as Record<string, { message?: string }>)) {
          if (err?.message) {
            out.push(`${itemNoun} ${i + 1}: ${itemLabels[col] ?? col} — ${err.message}`);
          }
        }
      });
      const root = (e as unknown as { root?: { message?: string } }).root?.message;
      if (root) out.push(root);
      continue;
    }
    const msg = e.message ?? e.root?.message;
    if (msg) out.push(labels[name] ? `${labels[name]}: ${msg}` : msg);
  }
  return out;
}
