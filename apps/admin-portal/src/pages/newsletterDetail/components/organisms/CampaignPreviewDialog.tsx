import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@sinnapi/ui';
import DesktopWindowsOutlinedIcon from '@mui/icons-material/DesktopWindowsOutlined';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';

type Props = { html: string | null; onClose: () => void };

/** Widths the preview frame snaps to. 375 is a phone; 640 fits the 600px email. */
const WIDTHS = { desktop: 640, mobile: 375 } as const;

/**
 * The rendered campaign, in an iframe.
 *
 * An iframe rather than `dangerouslySetInnerHTML` for two independent reasons,
 * either of which is sufficient:
 *
 *   * Fidelity. The email carries a full document — doctype, its own <style>
 *     block, media queries. Injected into the portal's DOM it would inherit the
 *     admin theme's cascade and leak its own rules back out, so the preview
 *     would be of something nobody will ever receive.
 *   * Containment. `sandbox` with no `allow-same-origin` means the document
 *     cannot reach the portal's DOM, cookies or storage at all. The renderer is
 *     already injection-free by construction, but a preview surface that would
 *     be dangerous if that ever stopped being true is a bad bet to take.
 */
export default function CampaignPreviewDialog({ html, onClose }: Props) {
  const [device, setDevice] = useState<keyof typeof WIDTHS>('desktop');

  return (
    <Dialog open={Boolean(html)} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          Preview
          <ToggleButtonGroup
            exclusive
            size="small"
            value={device}
            onChange={(_, next) => next && setDevice(next)}
          >
            <ToggleButton value="desktop" aria-label="Desktop width">
              <DesktopWindowsOutlinedIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="mobile" aria-label="Mobile width">
              <PhoneIphoneIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: 'action.hover', p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Box
            component="iframe"
            title="Newsletter preview"
            srcDoc={html ?? ''}
            sandbox=""
            sx={{
              width: WIDTHS[device],
              maxWidth: '100%',
              height: '65vh',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: '#fff',
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
