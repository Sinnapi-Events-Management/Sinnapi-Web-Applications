import { Alert, Box, DialogActions, DialogContent, Divider, Grid, Stack } from '@sinnapi/ui';
import type { PackageModel } from '@/lib/types';
import { usePackageEditor } from '../../hooks/usePackageEditor';
import { usePackageServiceOptions } from '../../hooks/usePackageServiceOptions';
import PackageIdentityFields from '../molecules/PackageIdentityFields';
import PackageCoverField from '../molecules/PackageCoverField';
import PackageTermsFields from '../molecules/PackageTermsFields';
import PackageScopeSection from '../molecules/PackageScopeSection';
import PackagePublishFields from '../molecules/PackagePublishFields';
import PackageTiersSection from './PackageTiersSection';
import PackageAddOnsSection from './PackageAddOnsSection';
import PackagePreviewPanel from './PackagePreviewPanel';
import PackageEditorActions from './PackageEditorActions';

type Props = {
  vendorId: string;
  /** The package being edited, or null to create one. */
  pkg: PackageModel | null;
  onCancel: () => void;
  onSaved: () => void;
};

/**
 * The package editor: the fields on the left, what a client will see on the
 * right.
 *
 * The preview is not a nicety. A package is the first priced thing on this
 * platform a vendor publishes without anyone checking it first, and the gap
 * between "three tiers of numbers in a form" and "what that reads like to
 * someone deciding whether to hire me" is where the mistakes are.
 *
 * WHAT THIS FILE IS AND IS NOT
 * It is the arrangement of the editor and nothing else — every section is its
 * own component and every piece of behaviour is in `usePackageEditor`. That
 * split is what keeps a form this large legible: the order of the sections is
 * a product decision that changes often, and it should be readable in one
 * screen without scrolling past the save logic to find it.
 *
 * Two columns from `md`, stacked below it, with the preview following the form
 * on a phone rather than leading it.
 */
export default function PackageEditorForm({ vendorId, pkg, onCancel, onSaved }: Props) {
  const editor = usePackageEditor(vendorId, pkg, onSaved);
  const { control, setValue } = editor;
  const { services, options: serviceOptions } = usePackageServiceOptions(vendorId, control);

  return (
    <Box component="form" onSubmit={editor.submit} noValidate>
      <DialogContent dividers>
        {editor.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {editor.error}
          </Alert>
        )}

        <Grid container spacing={{ xs: 3, md: 4 }}>
          <Grid item xs={12} md={7}>
            <Stack spacing={3} divider={<Divider flexItem />}>
              <PackageIdentityFields
                control={control}
                setValue={setValue}
                services={services}
                serviceOptions={serviceOptions}
              />
              <PackageCoverField vendorId={vendorId} control={control} />
              <PackageTiersSection control={control} tiers={editor.tiers} />
              <PackageAddOnsSection control={control} addOns={editor.addOns} />
              <PackageScopeSection control={control} />
              <PackageTermsFields control={control} />
              <PackagePublishFields control={control} />
            </Stack>
          </Grid>

          <Grid item xs={12} md={5}>
            <PackagePreviewPanel control={control} />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <PackageEditorActions busy={editor.busy} isEditing={editor.isEditing} onCancel={onCancel} />
      </DialogActions>
    </Box>
  );
}
