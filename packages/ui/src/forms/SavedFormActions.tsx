'use client';
import { Button, Stack } from '@mui/material';

export type SavedFormActionsProps = {
  /** A write is in flight; both controls lock and Save states so. */
  busy: boolean;
  /** From `useSavedForm`. Nothing to save and nothing to discard when false. */
  isDirty: boolean;
  /** Returns the fields to the last saved values. */
  onRevert: () => void;
  saveLabel?: string;
  busyLabel?: string;
  revertLabel?: string;
};

/**
 * The Save / Discard row every "edit this record" card in the portals ends with.
 *
 * Both controls are disabled while clean, which is the point of pairing them with
 * `useSavedForm`: a Save that fires a write with nothing to write is a round trip
 * and a toast the user didn't earn, and a Discard with nothing to discard is a
 * button that appears to do something and doesn't.
 *
 * The stack is `column-reverse` on phones so Save — the primary action and the one
 * a thumb reaches first — stays at the bottom of the column, while on a wider row
 * it keeps the conventional trailing position. Full-width below `sm` because a
 * right-aligned pair of small targets is the layout phone users miss most.
 */
export function SavedFormActions({
  busy,
  isDirty,
  onRevert,
  saveLabel = 'Save changes',
  busyLabel = 'Saving…',
  revertLabel = 'Discard changes',
}: SavedFormActionsProps) {
  const locked = busy || !isDirty;
  const fullWidthBelowSm = { width: { xs: '100%', sm: 'auto' } };

  return (
    <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
      <Button onClick={onRevert} disabled={locked} sx={fullWidthBelowSm}>
        {revertLabel}
      </Button>
      <Button type="submit" variant="contained" disabled={locked} sx={fullWidthBelowSm}>
        {busy ? busyLabel : saveLabel}
      </Button>
    </Stack>
  );
}
