import { Dialog, DialogTitle, Typography, useMediaQuery, useTheme } from '@sinnapi/ui';
import ServiceForm from './ServiceForm';
import type { ServiceModel } from '@/lib/types';

type Props = {
  open: boolean;
  vendorId: string;
  /** The service being edited, or null for a new one. */
  service: ServiceModel | null;
  onClose: () => void;
};

/**
 * Dialog shell for adding or editing a service.
 *
 * The form is a child rather than inlined, and mounted only while open, so
 * MUI's unmount-on-close discards react-hook-form's state with it. That is
 * what makes one dialog safe for both jobs: `defaultValues` is read once per
 * mount, so every open seeds from the service it was given and a cancelled
 * draft is never waiting behind a reopened dialog.
 *
 * Full-screen below `sm`, matching `PackageEditorDialog`: four fields plus a
 * four-card picker is taller than a phone viewport, and a scrolling dialog
 * inside a scrolling page is how a vendor loses the save button.
 */
export default function ServiceDialog({ open, vendorId, service, onClose }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle sx={{ pb: 1 }}>
        {service ? 'Edit service' : 'Add a service'}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {service
            ? 'Changes show on your profile as soon as you save. Prices stay on the packages under this service.'
            : 'Describe what you do. You will price it with packages afterwards.'}
        </Typography>
      </DialogTitle>
      {open && (
        <ServiceForm vendorId={vendorId} service={service} onCancel={onClose} onSuccess={onClose} />
      )}
    </Dialog>
  );
}
