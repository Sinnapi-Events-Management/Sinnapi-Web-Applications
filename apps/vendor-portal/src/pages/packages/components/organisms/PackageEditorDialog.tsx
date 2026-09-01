import { Dialog, DialogTitle, useMediaQuery, useTheme } from '@sinnapi/ui';
import type { PackageModel } from '@/lib/types';
import PackageEditorForm from './PackageEditorForm';

type Props = {
  open: boolean;
  vendorId: string;
  /** The package being edited, or null for a new one. */
  pkg: PackageModel | null;
  onClose: () => void;
};

/**
 * Dialog shell for the package editor.
 *
 * Full-screen below `sm` because the form is a two-level tree with a preview
 * beside it — a modal card with its own margins would leave the line-item rows
 * about 240px to work in.
 *
 * `keepMounted` is deliberately off and the form is only mounted while open, so
 * every open starts from the package it was given. The editor's field arrays
 * are seeded from `defaultValues`, which react-hook-form reads once — a form
 * kept alive between opens would show the previous package's tiers.
 */
export default function PackageEditorDialog({ open, vendorId, pkg, onClose }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" fullScreen={fullScreen}>
      <DialogTitle>{pkg ? `Edit ${pkg.name}` : 'New package'}</DialogTitle>
      {open && (
        <PackageEditorForm vendorId={vendorId} pkg={pkg} onCancel={onClose} onSaved={onClose} />
      )}
    </Dialog>
  );
}
