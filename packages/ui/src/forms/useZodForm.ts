import { useForm, type FieldValues, type UseFormProps, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';

/** Everything `useForm` takes except the resolver, which the schema provides. */
export type UseZodFormProps<T extends FieldValues> = Omit<UseFormProps<T>, 'resolver'>;

/**
 * `useForm` pre-wired to a zod schema with the house validation timing.
 *
 * `mode: 'onBlur'` is the point: a field is checked when the user leaves it,
 * so mistakes surface next to the input while they're still in context rather
 * than as a wall of errors on submit. `reValidateMode: 'onChange'` takes over
 * once the form has been submitted once, and from then on a shown error clears
 * as the user types — re-blurring to find out whether a correction worked is
 * the annoying half of onBlur validation, and the submit is the moment that
 * half stops being worth it. (Before that first submit, `mode` still governs
 * both directions: an error raised on blur clears on the next blur.)
 *
 * WHEN it validates is only half the rule. WHETHER the result may be shown is
 * the other half, and it lives in `useFieldError`, which every `Controlled*`
 * component goes through: a field stays quiet until the user has actually put
 * something into it or has tried to submit. Blur is not proof of intent — a
 * modal's focus trap blurs an `autoFocus`ed field a tick after it opens — and
 * a form that greets you with an error about a field you have not touched has
 * mistaken its own machinery for the user's mistake.
 *
 * Every portal form goes through this so the timing can never drift form to
 * form; callers only supply the schema and their default/`values`.
 */
export function useZodForm<T extends FieldValues>(
  schema: ZodType<T>,
  options?: UseZodFormProps<T>,
): UseFormReturn<T> {
  return useForm<T>({
    mode: 'onBlur',
    reValidateMode: 'onChange',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as ZodType<any>),
    ...options,
  });
}
