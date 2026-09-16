'use client';
import { useId, type ReactNode } from 'react';
import { Box, Dialog, DialogContent, Stack, Typography, type Breakpoint } from '@mui/material';

export type SetupDialogProps = {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  /**
   * Beside the title — the only way out, so the caller decides what it is
   * (sign out, or "back" for someone the flow is not blocking).
   */
  headerActions?: ReactNode;
  /** Width of the dialog; the content fills it. */
  maxWidth?: Breakpoint;
  children: ReactNode;
};

/**
 * A blocking modal for flows a user must finish before the app behind it is
 * usable — onboarding, forced setup.
 *
 * Built on the same `Dialog` as `ConfirmDialog`, so it sits on the shared
 * blurred scrim from `modalOverrides` and covers the portal shell, sidebar
 * included. Deliberately not dismissible: no `onClose` is passed, so neither a
 * backdrop click nor Escape closes it, and there is no close button. Leaving is
 * the caller's business, through `headerActions` or by navigating away.
 *
 * Sized to its content column rather than the viewport: a dialog wider than
 * what it holds is just empty margin. It grows with its content up to the
 * viewport height; past that the header stays put and only the body scrolls.
 * Phones get the whole screen — a margin there only costs width.
 */
export function SetupDialog({
  open,
  title,
  description,
  headerActions,
  maxWidth = 'md',
  children,
}: SetupDialogProps) {
  const titleId = useId();

  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      aria-labelledby={titleId}
      maxWidth={maxWidth}
      fullWidth
      PaperProps={{
        sx: {
          m: { xs: 0, sm: 3 },
          width: { xs: '100%', sm: 'calc(100% - 48px)' },
          height: { xs: '100%', sm: 'auto' },
          maxHeight: { xs: '100%', sm: 'calc(100% - 48px)' },
          borderRadius: { xs: 0, sm: 2 },
        },
      }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 3, md: 4 },
          pt: { xs: 2.5, md: 3.5 },
          pb: { xs: 2, md: 2.5 },
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {headerActions && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ flexShrink: 0, mb: 3, justifyContent: 'flex-end' }}
          >
            {headerActions}
          </Stack>
        )}
        <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
          <Typography id={titleId} variant="h5" component="h2" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Stack>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        )}
      </Box>

      <DialogContent sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2.5, md: 3 } }}>
        {children}
      </DialogContent>
    </Dialog>
  );
}
