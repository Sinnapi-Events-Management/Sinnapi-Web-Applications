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
 * than as a wall of errors on submit. `reValidateMode: 'onChange'` then clears
 * a shown error as soon as the user fixes it — re-blurring to find out whether
 * the correction worked would be the annoying half of onBlur validation.
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
