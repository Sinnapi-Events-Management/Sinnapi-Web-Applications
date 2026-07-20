import { Box, Button, Divider, Stack } from '@sinnapi/ui';
import { STATUS_OPTIONS, type SelectOption, type UserFormValues } from '../../schema';
import { useUserForm } from '../../hooks/useUserForm';
import ControlledField from './ControlledField';
import RoleMultiSelect from './RoleMultiSelect';

type Props = {
  mode: 'create' | 'edit';
  /** Pre-populated form values; must be referentially stable per record. */
  values: UserFormValues;
  roleOptions: SelectOption[];
  busy: boolean;
  onCancel: () => void;
  onSave: (values: UserFormValues) => Promise<boolean>;
};

/**
 * The editable staff fields, shared by the create and edit drawers. Scrolls
 * independently of the pinned action bar so the primary button is always
 * reachable. Email is editable only on create (it's the account identity); the
 * initial status selector is create-only, since an existing user's status is
 * owned by the block/activate flow.
 */
export default function UserForm({ mode, values, roleOptions, busy, onCancel, onSave }: Props) {
  const { control, isDirty, submit } = useUserForm(values, onSave);
  const isCreate = mode === 'create';

  return (
    <Box
      component="form"
      onSubmit={submit}
      noValidate
      sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <ControlledField
              name="first_name"
              control={control}
              label="First name"
              required
              autoFocus
            />
            <ControlledField name="middle_name" control={control} label="Middle name" />
          </Stack>
          <ControlledField name="last_name" control={control} label="Last name" required />

          <ControlledField
            name="email"
            control={control}
            label="Email"
            type="email"
            required={isCreate}
            disabled={!isCreate}
            helperText={
              isCreate
                ? 'A one-time sign-in password will be emailed here.'
                : "Email is the account identity and can't be changed."
            }
          />

          <ControlledField
            name="phone"
            control={control}
            label="Phone"
            placeholder="+256 700 000000"
          />

          <RoleMultiSelect name="roleIds" control={control} label="Roles" options={roleOptions} />

          {isCreate && (
            <ControlledField
              name="status"
              control={control}
              label="Initial status"
              options={STATUS_OPTIONS}
              helperText="Suspended accounts can't sign in until activated."
            />
          )}
        </Stack>
      </Box>

      <Divider />
      <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={busy || (!isCreate && !isDirty)}>
          {busy ? (isCreate ? 'Creating…' : 'Saving…') : isCreate ? 'Create user' : 'Save changes'}
        </Button>
      </Stack>
    </Box>
  );
}
