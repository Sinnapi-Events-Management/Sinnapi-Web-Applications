import { useRef } from 'react';
import { Alert, Box, Divider, Drawer, IconButton, Stack, Typography } from '@sinnapi/ui';
import CloseIcon from '@mui/icons-material/Close';
import type { SelectOption, UserFormValues } from '../../schema';
import UserForm from '../molecules/UserForm';

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  /** Pre-populated form values; must be referentially stable per record. */
  values: UserFormValues;
  roleOptions: SelectOption[];
  /** Secondary line under the title, e.g. the user's email in edit mode. */
  subtitle?: string;
  busy: boolean;
  /** Save failure, surfaced above the fields so it survives a scroll. */
  err: string | null;
  onClose: () => void;
  onSave: (values: UserFormValues) => Promise<boolean>;
};

/**
 * Right-hand drawer that hosts the create/edit form. Owns the shell (header,
 * close affordance, error banner); the fields and the write live below it.
 *
 * `values` is retained through the slide-out via a ref so an edit drawer doesn't
 * blank its fields on the way closed (the page clears the record immediately).
 * The default `keepMounted={false}` still unmounts afterwards, so the form's
 * react-hook-form state resets between opens.
 */
export default function UserFormDrawer({
  open,
  mode,
  values,
  roleOptions,
  subtitle,
  busy,
  err,
  onClose,
  onSave,
}: Props) {
  const lastValues = useRef(values);
  if (open) lastValues.current = values;
  const shown = open ? values : lastValues.current;

  const isCreate = mode === 'create';

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={busy ? undefined : onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 480 }, display: 'flex', flexDirection: 'column' },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 3, py: 2 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight={600} noWrap>
            {isCreate ? 'New user' : 'Edit user'}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {subtitle}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} disabled={busy} aria-label="Close drawer" edge="end">
          <CloseIcon />
        </IconButton>
      </Stack>
      <Divider />

      {err && (
        <Alert severity="error" sx={{ mx: 3, mt: 2 }}>
          {err}
        </Alert>
      )}

      <UserForm
        mode={mode}
        values={shown}
        roleOptions={roleOptions}
        busy={busy}
        onCancel={onClose}
        onSave={onSave}
      />
    </Drawer>
  );
}
