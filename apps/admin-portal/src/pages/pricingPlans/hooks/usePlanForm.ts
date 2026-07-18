import { useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { PlanModel } from '@/lib/types';
import { emptyPlanValues, planFormSchema, toFormValues, type PlanFormValues } from '../schema';

/**
 * Wires the plan form to react-hook-form: zod validates, `values` keeps the
 * fields in step with the plan being edited (or the blank defaults when
 * creating), and `useFieldArray` drives the dynamic feature list.
 */
export function usePlanForm(
  plan: PlanModel | null,
  onSave: (values: PlanFormValues) => Promise<boolean>,
) {
  const values = useMemo(() => (plan ? toFormValues(plan) : emptyPlanValues), [plan]);

  const {
    control,
    handleSubmit,
    formState: { isDirty },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    values,
  });

  const features = useFieldArray({ control, name: 'features' });

  return {
    control,
    features,
    isDirty,
    submit: handleSubmit(async (v) => {
      await onSave(v);
    }),
  };
}
