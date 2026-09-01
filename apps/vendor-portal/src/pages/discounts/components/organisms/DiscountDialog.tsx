import { Dialog, DialogTitle, useMediaQuery, useTheme } from '@sinnapi/ui';
import type { PromotionModel } from '@/lib/types';
import DiscountForm from './DiscountForm';
import type { DiscountRow } from '../../schema';

type Props = {
  open: boolean;
  vendorId: string;
  /** The code being edited, or null to create a new one. */
  discount: DiscountRow | null;
  promotions: PromotionModel[];
  onClose: (warning?: string) => void;
};

/**
 * Dialog shell for the discount editor.
 *
 * Full-screen below `sm`, following the campaign and package editors: the form
 * carries seven fields and a date range, and a modal card with its own margins
 * leaves the last of them under a phone keyboard.
 *
 * The form is mounted only while the dialog is open, so every open starts from
 * the code it was given. Its defaults are seeded from `defaultValues`, which
 * react-hook-form reads once — a form kept alive between opens would show the
 * previous code's terms.
 */
export default function DiscountDialog({ open, vendorId, discount, promotions, onClose }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    // `md`, not `sm`: the scope picker below the fold is a scrolling list of
    // packages and their tiers, and at `sm` a vendor with four packages reads
    // it through a 260px window.
    <Dialog open={open} onClose={() => onClose()} fullWidth maxWidth="md" fullScreen={fullScreen}>
      <DialogTitle>{discount ? 'Edit discount' : 'New discount'}</DialogTitle>
      {open && (
        <DiscountForm
          vendorId={vendorId}
          discount={discount}
          promotions={promotions}
          onCancel={() => onClose()}
          onSuccess={onClose}
        />
      )}
    </Dialog>
  );
}
