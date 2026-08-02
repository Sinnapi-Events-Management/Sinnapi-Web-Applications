import { Controller } from 'react-hook-form';
import { Box, Button, Divider, FormControlLabel, Stack, Switch } from '@sinnapi/ui';
import type { ServiceCategoryModel } from '@/lib/types';
import { NO_PARENT, type CategoryFormValues } from '../../schema';
import { useCategoryForm } from '../../hooks/useCategoryForm';
import ControlledField, { type SelectOption } from './ControlledField';

type Props = {
  /** The category being edited, or null when creating. */
  category: ServiceCategoryModel | null;
  isCreate: boolean;
  /** Every other category, offered as the parent select — the category being
   * edited is excluded so it can't be made its own parent. */
  parentOptions: SelectOption[];
  /** Suggested sort order for a new category — one past the current highest. */
  nextSortOrder: number;
  busy: boolean;
  onCancel: () => void;
  onSave: (values: CategoryFormValues) => Promise<boolean>;
};

/**
 * The editable category fields. Scrolls independently of the pinned action
 * bar so the save button is always reachable. Drives both create and edit —
 * the only difference is the button copy and the initial values.
 */
export default function CategoryForm({
  category,
  isCreate,
  parentOptions,
  nextSortOrder,
  busy,
  onCancel,
  onSave,
}: Props) {
  const { control, isDirty, submit } = useCategoryForm(category, nextSortOrder, onSave);

  const options: SelectOption[] = [
    { value: NO_PARENT, label: 'None (top-level)' },
    ...parentOptions,
  ];

  return (
    <Box
      component="form"
      onSubmit={submit}
      noValidate
      sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        <Stack spacing={2.5}>
          <ControlledField name="name" control={control} label="Category name" required autoFocus />
          <ControlledField
            name="key"
            control={control}
            label="Key"
            disabled
            helperText={
              isCreate
                ? 'Auto-generated from the name — lowercase, no spaces.'
                : 'Fixed once created — vendor search and the public site key off it.'
            }
          />
          <ControlledField
            name="parent_id"
            control={control}
            label="Parent category"
            options={options}
            helperText="Leave as top-level, or nest this under another category."
          />
          <ControlledField
            name="icon"
            control={control}
            label="Icon"
            helperText="Optional icon name shown in vendor-facing category pickers."
          />
          <ControlledField
            name="sort_order"
            control={control}
            label="Sort order"
            helperText="Lower shows first. Prefilled with the next open position — change it to reorder."
          />

          <Divider />
          <Controller
            name="is_active"
            control={control}
            render={({ field: { value, ...field } }) => (
              <FormControlLabel
                control={<Switch {...field} checked={value} />}
                label="Active (selectable by vendors)"
              />
            )}
          />
        </Stack>
      </Box>

      <Divider />
      <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={busy || !isDirty}>
          {busy ? 'Saving…' : isCreate ? 'Create category' : 'Save changes'}
        </Button>
      </Stack>
    </Box>
  );
}
