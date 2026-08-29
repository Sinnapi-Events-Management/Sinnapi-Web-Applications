import { Controller } from 'react-hook-form';
import {
  Alert,
  Box,
  Button,
  DialogActions,
  DialogContent,
  Divider,
  Grid,
  PackageShowcase,
  Stack,
  Typography,
} from '@sinnapi/ui';
import { ControlledField, ControlledCheckbox } from '@sinnapi/ui/forms';
import AddIcon from '@mui/icons-material/Add';
import { usePackageEditor } from '../../hooks/usePackageEditor';
import { usePackageServiceOptions } from '../../hooks/usePackageServiceOptions';
import type { PackageModel } from '@/lib/types';
import PackageTierFields from '../molecules/PackageTierFields';
import PackageLineFields from '../molecules/PackageLineFields';
import PackageScopeFields from '../molecules/PackageScopeFields';
import PackageTermsFields from '../molecules/PackageTermsFields';
import PackageCoverField from '../molecules/PackageCoverField';
import PackagePricingModelField from '../molecules/PackagePricingModelField';

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
 * someone deciding whether to hire me" is where the mistakes are. It renders
 * through the same `PackageShowcase` the client portal and the public site use,
 * from the live form values — so it cannot flatter what gets published.
 *
 * Two columns from `md`, stacked below it. On a phone the preview follows the
 * form rather than leading it: a vendor arrives here to type, and a preview of
 * an empty package above the first field is a screen of nothing.
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
            <Stack spacing={3}>
              <Stack spacing={2}>
                <ControlledField
                  name="name"
                  control={control}
                  label="Package name"
                  placeholder="Wedding photography"
                  autoFocus
                />
                <ControlledField
                  name="summary"
                  control={control}
                  label="One-line summary"
                  placeholder="Full-day coverage with a second shooter and an album."
                  multiline
                  minRows={2}
                />
                <ControlledField
                  name="vendor_service_id"
                  control={control}
                  label="Service"
                  options={serviceOptions}
                  helperText="Groups this package under one of your listed services, and decides which ways of charging you may pick below."
                />
                {/* Below the service, because the service is what narrows it.
                    A vendor who picks the model first and the service second
                    would watch their answer disappear. */}
                <PackagePricingModelField
                  control={control}
                  services={services}
                  setPricingModel={(value) =>
                    setValue('pricing_model', value, { shouldValidate: false })
                  }
                />
              </Stack>

              <Controller
                name="cover_image_url"
                control={control}
                render={({ field }) => (
                  <PackageCoverField
                    vendorId={vendorId}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                  />
                )}
              />

              <Divider />

              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  Tiers
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Two or three price points let a client choose rather than decide whether. Star the
                  one you want read first.
                </Typography>

                {editor.tiers.error && (
                  <Alert severity="warning" sx={{ mt: 1.5 }}>
                    {editor.tiers.error}
                  </Alert>
                )}

                <Stack spacing={2} sx={{ mt: 2 }}>
                  {editor.tiers.fields.map((field, index) => (
                    <Controller
                      key={field.id}
                      name={`tiers.${index}.is_recommended`}
                      control={control}
                      render={({ field: recommended }) => (
                        <PackageTierFields
                          index={index}
                          control={control}
                          isRecommended={Boolean(recommended.value)}
                          canRemove={editor.tiers.canRemove}
                          onRecommend={() => editor.tiers.recommend(index)}
                          onRemove={() => editor.tiers.remove(index)}
                        />
                      )}
                    />
                  ))}
                </Stack>

                <Button startIcon={<AddIcon />} onClick={editor.tiers.add} sx={{ mt: 2 }}>
                  Add tier
                </Button>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  Optional add-ons
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Offered alongside every tier and never counted in a tier&apos;s total. You choose
                  which ones to price in when you build a quote.
                </Typography>

                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  {editor.addOns.fields.map((field, index) => (
                    <PackageLineFields
                      key={field.id}
                      path={`add_ons.${index}`}
                      control={control}
                      canRemove
                      onRemove={() => editor.addOns.remove(index)}
                    />
                  ))}
                </Stack>

                <Button startIcon={<AddIcon />} onClick={editor.addOns.add} sx={{ mt: 1.5 }}>
                  Add an add-on
                </Button>
              </Box>

              <Divider />

              <Controller
                name="inclusions"
                control={control}
                render={({ field }) => (
                  <PackageScopeFields
                    label="What's included"
                    hint="The promises a client can hold you to. One per line."
                    placeholder="Edited photos delivered within 14 days"
                    items={field.value ?? []}
                    onChange={field.onChange}
                  />
                )}
              />

              <Controller
                name="exclusions"
                control={control}
                render={({ field }) => (
                  <PackageScopeFields
                    label="Not included"
                    hint="The boundary. This is the list that prevents arguments after the event."
                    placeholder="Transport outside Kampala"
                    items={field.value ?? []}
                    onChange={field.onChange}
                  />
                )}
              />

              <Divider />

              <PackageTermsFields control={control} />

              <Divider />

              <ControlledField
                name="notes"
                control={control}
                label="Notes (optional)"
                placeholder="Anything else a client should know before asking for this."
                multiline
                minRows={2}
              />

              <ControlledCheckbox
                name="is_active"
                control={control}
                label={
                  <Box>
                    <Typography variant="body2">Still selling this package</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Turn this off to archive it. It stays on the quotes already built from it and
                      leaves your public profile.
                    </Typography>
                  </Box>
                }
              />
            </Stack>
          </Grid>

          <Grid item xs={12} md={5}>
            <Box sx={{ position: { md: 'sticky' }, top: { md: 8 } }}>
              <Typography variant="overline" color="text.secondary">
                What clients will see
              </Typography>
              <Box sx={{ mt: 1 }}>
                <PackageShowcase pkg={editor.preview} />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel} disabled={editor.busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={editor.busy}>
          {editor.busy ? 'Saving…' : editor.isEditing ? 'Save changes' : 'Create package'}
        </Button>
      </DialogActions>
    </Box>
  );
}
