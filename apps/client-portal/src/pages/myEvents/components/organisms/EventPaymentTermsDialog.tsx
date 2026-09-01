import { Dialog, DialogTitle, Typography, useMediaQuery, useTheme } from '@sinnapi/ui';
import type { MyEventModel } from '@/lib/types';
import EventPaymentTermsForm from './EventPaymentTermsForm';

type Props = {
  event: MyEventModel;
  open: boolean;
  onClose: () => void;
};

/**
 * Budget and payment terms for a whole event.
 *
 * Mounted only while open so the form's draft state — the budget fields
 * included — is created and destroyed with the dialog. Reopening after a cancel
 * shows what the event actually carries, not a half-edited figure.
 *
 * Full screen below `sm`: the content is a form plus a priced breakdown, and a
 * floating card on a phone gives that a viewport-width column inside a
 * viewport-width sheet with margins wasted on both sides.
 */
export default function EventPaymentTermsDialog({ event, open, onClose }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={fullScreen}>
      <DialogTitle sx={{ pb: 1 }}>
        Budget and payment terms
        <Typography variant="body2" color="text.secondary" noWrap>
          {event.title}
        </Typography>
      </DialogTitle>
      {open && <EventPaymentTermsForm event={event} onClose={onClose} />}
    </Dialog>
  );
}
