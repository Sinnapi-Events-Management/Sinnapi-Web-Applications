'use client';
import { Alert, Button, Fade, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

export type StickySaveBarProps = {
  /** There is something to save. The bar only shows while this (or `busy`) holds. */
  open: boolean;
  busy: boolean;
  onSave: () => void;
  onDiscard: () => void;
  /** Failures from the last save, one line each. */
  errors?: string[];
  message?: string;
  saveLabel?: string;
  busyLabel?: string;
  discardLabel?: string;
};

/**
 * The Save / Discard bar for a long or sectioned edit surface.
 *
 * `SavedFormActions` sits at the end of a card, which is fine for a short form and
 * wrong for one split across panels: the button is out of sight while the user
 * edits, and on a sectioned page it belongs to no single section. This bar pins
 * to the bottom of the scrolling column instead, and exists only while there are
 * edits — a permanently visible pair of disabled buttons is chrome that says
 * nothing.
 *
 * `sticky` rather than `fixed`, so it stays inside the content column instead of
 * sliding under the sidebar, and on a short panel it simply rests below the
 * content. Buttons go full width below `sm`, with Save on the thumb side.
 */
export function StickySaveBar({
  open,
  busy,
  onSave,
  onDiscard,
  errors = [],
  message = 'You have unsaved changes',
  saveLabel = 'Save changes',
  busyLabel = 'Saving…',
  discardLabel = 'Discard',
}: StickySaveBarProps) {
  const visible = open || busy || errors.length > 0;

  return (
    <Fade in={visible} unmountOnExit>
      <Paper
        elevation={0}
        role="region"
        aria-label="Unsaved changes"
        sx={{
          position: 'sticky',
          bottom: { xs: 12, md: 16 },
          zIndex: (t) => t.zIndex.appBar - 1,
          mt: 3,
          p: { xs: 1.5, sm: 2 },
          borderRadius: 3,
          border: 1,
          borderColor: 'divider',
          bgcolor: (t) => alpha(t.palette.background.paper, 0.92),
          backdropFilter: 'blur(10px)',
          boxShadow: (t) =>
            `0 8px 28px ${alpha(t.palette.common.black, t.palette.mode === 'dark' ? 0.5 : 0.12)}`,
        }}
      >
        <Stack spacing={1.5}>
          {errors.map((error) => (
            <Alert key={error} severity="error">
              {error}
            </Alert>
          ))}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            spacing={1.5}
          >
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }} aria-live="polite">
              {open ? message : 'All changes saved'}
            </Typography>
            <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1}>
              <Button onClick={onDiscard} disabled={busy || !open}>
                {discardLabel}
              </Button>
              <Button variant="contained" onClick={onSave} disabled={busy || !open}>
                {busy ? busyLabel : saveLabel}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Paper>
    </Fade>
  );
}
