import { Grid, TextField, MenuItem, Autocomplete, Typography } from '@sinnapi/ui';
import type { ReferenceOption } from '@/lib/queries';
import { APPLICANT_TYPES, YEARS_OPTIONS } from '../data/options';
import type { RegistrationApi } from '../hooks/useVendorRegistration';

type Props = { api: RegistrationApi; categories: ReferenceOption[] };

/** Step 1 — business identity, primary + additional services, and owner contact. */
export default function StepBusinessOwner({ api, categories }: Props) {
  const { values, errors, set, submitting } = api;
  const byKey = (k: string) => categories.find((c) => c.key === k)?.name ?? k;

  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Business / working name"
          fullWidth
          required
          disabled={submitting}
          value={values.businessName}
          onChange={(e) => set('businessName', e.target.value)}
          error={!!errors.businessName}
          helperText={errors.businessName}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Who is applying?"
          select
          fullWidth
          required
          disabled={submitting}
          value={values.applicantType}
          onChange={(e) => set('applicantType', e.target.value as typeof values.applicantType)}
          error={!!errors.applicantType}
          helperText={errors.applicantType}
        >
          {APPLICANT_TYPES.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          label="Primary category"
          select
          fullWidth
          required
          disabled={submitting}
          value={values.primaryCategoryKey}
          onChange={(e) => set('primaryCategoryKey', e.target.value)}
          error={!!errors.primaryCategoryKey}
          helperText={errors.primaryCategoryKey}
        >
          {categories.map((c) => (
            <MenuItem key={c.key} value={c.key}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Years in operation"
          select
          fullWidth
          required
          disabled={submitting}
          value={values.yearsInOperation}
          onChange={(e) =>
            set('yearsInOperation', e.target.value as typeof values.yearsInOperation)
          }
          error={!!errors.yearsInOperation}
          helperText={errors.yearsInOperation}
        >
          {YEARS_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid item xs={12}>
        <Autocomplete
          multiple
          disabled={submitting}
          options={categories.map((c) => c.key)}
          value={values.serviceCategoryKeys}
          onChange={(_, v) => set('serviceCategoryKeys', v)}
          getOptionLabel={byKey}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Services you offer"
              placeholder="Add all that apply"
              required
              error={!!errors.serviceCategoryKeys}
              helperText={errors.serviceCategoryKeys}
            />
          )}
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          label="Brief bio / about your business"
          fullWidth
          multiline
          minRows={3}
          required
          disabled={submitting}
          value={values.biography}
          onChange={(e) => set('biography', e.target.value)}
          error={!!errors.biography}
          helperText={errors.biography ?? 'What you do, your style, and what makes you stand out.'}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          label="Base of operation / city"
          fullWidth
          required
          disabled={submitting}
          value={values.baseCity}
          onChange={(e) => set('baseCity', e.target.value)}
          error={!!errors.baseCity}
          helperText={errors.baseCity}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Location / address (optional)"
          fullWidth
          disabled={submitting}
          value={values.businessLocation}
          onChange={(e) => set('businessLocation', e.target.value)}
        />
      </Grid>

      <Grid item xs={12}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>
          Owner &amp; contact
        </Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Business owner full name"
          fullWidth
          required
          disabled={submitting}
          value={values.ownerFullName}
          onChange={(e) => set('ownerFullName', e.target.value)}
          error={!!errors.ownerFullName}
          helperText={errors.ownerFullName}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Business website (optional)"
          fullWidth
          disabled={submitting}
          value={values.website}
          onChange={(e) => set('website', e.target.value)}
          error={!!errors.website}
          helperText={errors.website}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Owner email"
          type="email"
          fullWidth
          required
          disabled={submitting}
          value={values.ownerEmail}
          onChange={(e) => set('ownerEmail', e.target.value)}
          error={!!errors.ownerEmail}
          helperText={errors.ownerEmail}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Owner phone"
          type="tel"
          fullWidth
          required
          disabled={submitting}
          value={values.ownerPhone}
          onChange={(e) => set('ownerPhone', e.target.value)}
          error={!!errors.ownerPhone}
          helperText={errors.ownerPhone}
        />
      </Grid>
    </Grid>
  );
}
