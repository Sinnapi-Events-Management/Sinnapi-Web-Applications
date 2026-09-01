import { Button, Stack } from '@sinnapi/ui';

type Props = {
  busy: boolean;
  /** True when saving changes to an existing package rather than creating one. */
  isEditing: boolean;
  onCancel: () => void;
};

/**
 * Cancel and save, at the foot of the editor.
 *
 * Full-width and stacked on a phone, where the dialog is full-screen and these
 * are the only two things below the fold — a pair of right-aligned buttons at
 * the bottom of a long form is a target the thumb has to reach for.
 */
export default function PackageEditorActions({ busy, isEditing, onCancel }: Props) {
  return (
    <Stack
      direction={{ xs: 'column-reverse', sm: 'row' }}
      spacing={1}
      justifyContent="flex-end"
      sx={{ width: '100%' }}
    >
      <Button onClick={onCancel} disabled={busy} sx={{ width: { xs: '100%', sm: 'auto' } }}>
        Cancel
      </Button>
      <Button
        type="submit"
        variant="contained"
        disabled={busy}
        sx={{ width: { xs: '100%', sm: 'auto' } }}
      >
        {busy ? 'Saving…' : isEditing ? 'Save changes' : 'Create package'}
      </Button>
    </Stack>
  );
}
