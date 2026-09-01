import { useState } from 'react';
import { useZodForm } from '@sinnapi/ui/forms';
import { useRequirementMutations, useServiceCategoryOptions } from '@/hooks/queries';
import type { EventRequirementModel } from '@/lib/types';
import {
  BLANK_REQUIREMENT,
  requirementSchema,
  requirementValues,
  toRequirementArgs,
} from '../schema';

/**
 * Adding or editing one budget line.
 *
 * `defaultValues` rather than `values`: the dialog unmounts its form on close,
 * so the fields are rebuilt from the row every time it opens, and a `values`
 * prop would overwrite what the client had just typed the moment a background
 * refetch landed — which on this page happens whenever any figure moves.
 *
 * The category is locked while editing an existing line. `save_event_requirement`
 * upserts on (event, category), so changing the category of a saved line would
 * either collide with another line the client already has or silently move
 * every quote and booking attached to this one under a different heading. Adding
 * a second line and cancelling this one is the honest way to do that, and it
 * keeps the history attached to the thing it happened to.
 */
export function useRequirementForm(
  eventId: string,
  editing: EventRequirementModel | null,
  onSaved: () => void,
) {
  const categories = useServiceCategoryOptions();
  const { save } = useRequirementMutations(eventId);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useZodForm(requirementSchema, {
    defaultValues: editing ? requirementValues(editing) : BLANK_REQUIREMENT,
  });

  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      await save.mutateAsync(toRequirementArgs(values, editing?.id));
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this line.');
    }
  });

  return {
    control,
    submit,
    error,
    busy: formState.isSubmitting,
    isEdit: Boolean(editing),
    categoryOptions: (categories.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    categoriesLoading: categories.isLoading,
  };
}
