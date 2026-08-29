import { Dialog, DialogTitle, Typography, useMediaQuery, useTheme } from '@sinnapi/ui';
import MediaForm from './MediaForm';
import type { PortfolioPlan } from '../../hooks/usePortfolioPlan';

type Props = {
  open: boolean;
  vendorId: string;
  plan: PortfolioPlan;
  nextSortOrder: number;
  needsCover: boolean;
  onClose: () => void;
};

/**
 * Dialog shell for adding portfolio media.
 *
 * The form is mounted with the dialog and unmounted with it, which is what resets
 * the fields and — through `useMediaUpload`'s cleanup — deletes any object that
 * was uploaded but never became a row.
 *
 * Full screen below `sm`: the dropzone, its file list and three fields do not fit
 * a phone inside a floating card without the list becoming a two-line scroller.
 */
export default function MediaDialog({
  open,
  vendorId,
  plan,
  nextSortOrder,
  needsCover,
  onClose,
}: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle sx={{ pb: 1 }}>
        Add to your portfolio
        <Typography variant="body2" color="text.secondary">
          Photos and video shown to clients on your public profile.
        </Typography>
      </DialogTitle>

      <MediaForm
        vendorId={vendorId}
        plan={plan}
        nextSortOrder={nextSortOrder}
        needsCover={needsCover}
        onCancel={onClose}
        onSuccess={onClose}
      />
    </Dialog>
  );
}
