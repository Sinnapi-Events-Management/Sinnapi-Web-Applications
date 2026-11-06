import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@sinnapi/ui';
import { useLogoDialog } from '../hooks/useLogoDialog';
import type { LogoGateState } from '../hooks/useLogoGateState';
import { LOGO_COPY, LOGO_GATE_LEAD } from '../schema/copy';
import DocumentHeaderPreview from '../molecules/DocumentHeaderPreview';
import LogoUploadField from '../molecules/LogoUploadField';
import ReuseOnboardingPhoto from '../molecules/ReuseOnboardingPhoto';

/** Mounted only while open, so each opening starts with a fresh upload state. */
function LogoDialogBody({ gate }: { gate: LogoGateState }) {
  const d = useLogoDialog(gate);

  return (
    <>
      <DialogContent>
        <Stack spacing={2.5} alignItems="center">
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'stretch' }}>
            {LOGO_GATE_LEAD[gate.reason]}
          </Typography>

          {d.canReuse && gate.onboardingPhotoUrl && (
            <ReuseOnboardingPhoto
              photoUrl={gate.onboardingPhotoUrl}
              busy={d.upload.busy}
              onUse={d.reuse}
            />
          )}

          <LogoUploadField upload={d.upload} businessName={gate.businessName} />

          {d.logoUrl && (
            <DocumentHeaderPreview
              businessName={gate.businessName}
              logoUrl={d.logoUrl}
              label={LOGO_COPY.dialog.previewLabel}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={gate.cancel} disabled={d.upload.busy}>
          {LOGO_COPY.dialog.cancelLabel}
        </Button>
        <Button variant="contained" onClick={() => void gate.complete()} disabled={!d.canContinue}>
          {LOGO_COPY.dialog.continueLabel}
        </Button>
      </DialogActions>
    </>
  );
}

/**
 * Asks for the business logo at the moment it is needed — on Send or Issue —
 * instead of sending the vendor off to Profile and losing their place.
 * Full screen on phones, so the picker and preview have room.
 */
export default function LogoRequiredDialog({ gate }: { gate: LogoGateState }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={gate.open}
      onClose={gate.cancel}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      aria-labelledby="logo-required-title"
    >
      <DialogTitle id="logo-required-title">{LOGO_COPY.dialog.title}</DialogTitle>
      {gate.open && <LogoDialogBody gate={gate} />}
    </Dialog>
  );
}
