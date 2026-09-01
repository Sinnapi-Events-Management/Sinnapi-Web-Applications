import { Dialog, DialogTitle, useMediaQuery, useTheme } from '@sinnapi/ui';
import type { PromotionModel } from '@/lib/types';
import PromotionForm from './PromotionForm';

type Props = {
  open: boolean;
  vendorId: string;
  /** The campaign being edited, or null to create a new one. */
  promotion: PromotionModel | null;
  onClose: (warning?: string) => void;
};

/**
 * Dialog shell for the campaign editor.
 *
 * Full-screen below `sm`, following the package editor: the form carries a
 * banner well and a date range, and a modal card with its own margins leaves
 * the last field under a phone keyboard.
 *
 * The form is mounted only while the dialog is open, so every open starts from
 * the campaign it was given. Its defaults are seeded from `defaultValues`,
 * which react-hook-form reads once — a form kept alive between opens would show
 * the previous campaign's copy.
 */
export default function PromotionDialog({ open, vendorId, promotion, onClose }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    // `md`, not `sm`: the scope picker below the fold is a scrolling list of
    // packages and their tiers, and at `sm` a vendor with four packages reads
    // it through a 260px window.
    <Dialog open={open} onClose={() => onClose()} fullWidth maxWidth="md" fullScreen={fullScreen}>
      <DialogTitle>{promotion ? 'Edit campaign' : 'New campaign'}</DialogTitle>
      {open && (
        <PromotionForm
          vendorId={vendorId}
          promotion={promotion}
          onCancel={() => onClose()}
          onSuccess={onClose}
        />
      )}
    </Dialog>
  );
}
