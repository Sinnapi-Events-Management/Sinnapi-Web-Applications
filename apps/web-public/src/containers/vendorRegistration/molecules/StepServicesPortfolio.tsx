import {
  Grid,
  TextField,
  MenuItem,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  FormHelperText,
  InputAdornment,
  FileUpload,
  Box,
} from '@sinnapi/ui';
import type { ReferenceOption } from '@/lib/queries';
import {
  PRICING_OPTIONS,
  LEAD_TIME_OPTIONS,
  IMAGE_ACCEPT,
  VIDEO_ACCEPT,
  IMAGE_MAX_MB,
  VIDEO_MAX_MB,
} from '../data/options';
import type { RegistrationApi } from '../hooks/useVendorRegistration';

type Props = { api: RegistrationApi; regions: ReferenceOption[] };

const SOCIALS = [
  { key: 'instagramUrl', label: 'Instagram profile' },
  { key: 'tiktokUrl', label: 'TikTok profile' },
  { key: 'linkedinUrl', label: 'LinkedIn profile' },
  { key: 'facebookUrl', label: 'Facebook profile' },
] as const;

/** Step 2 — pricing & availability, service regions, socials, and media uploads. */
export default function StepServicesPortfolio({ api, regions }: Props) {
  const { values, errors, set, submitting, files, selectFiles, removeFile } = api;

  const toggleRegion = (key: string) => {
    const on = values.serviceRegionKeys.includes(key);
    set(
      'serviceRegionKeys',
      on ? values.serviceRegionKeys.filter((k) => k !== key) : [...values.serviceRegionKeys, key],
    );
  };

  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12} sm={4}>
        <TextField
          label="How do you price? (optional)"
          select
          fullWidth
          disabled={submitting}
          value={values.pricingModel}
          onChange={(e) => set('pricingModel', e.target.value as typeof values.pricingModel)}
        >
          <MenuItem value="">
            <em>No preference</em>
          </MenuItem>
          {PRICING_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          label="Starting price (optional)"
          fullWidth
          disabled={submitting}
          value={values.startingPrice}
          onChange={(e) => set('startingPrice', e.target.value)}
          error={!!errors.startingPrice}
          helperText={errors.startingPrice}
          InputProps={{ startAdornment: <InputAdornment position="start">UGX</InputAdornment> }}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          label="Typical lead time (optional)"
          select
          fullWidth
          disabled={submitting}
          value={values.leadTime}
          onChange={(e) => set('leadTime', e.target.value as typeof values.leadTime)}
        >
          <MenuItem value="">
            <em>No preference</em>
          </MenuItem>
          {LEAD_TIME_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid item xs={12}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Service regions{' '}
          <Box component="span" sx={{ color: 'error.main' }}>
            *
          </Box>
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Where can clients book you? Select one or more.
        </Typography>
        <FormGroup row sx={{ mt: 1 }}>
          {regions.map((r) => (
            <FormControlLabel
              key={r.key}
              sx={{ width: { xs: '100%', sm: '33%' }, m: 0 }}
              control={
                <Checkbox
                  disabled={submitting}
                  checked={values.serviceRegionKeys.includes(r.key)}
                  onChange={() => toggleRegion(r.key)}
                />
              }
              label={r.name}
            />
          ))}
        </FormGroup>
        {errors.serviceRegionKeys && (
          <FormHelperText error>{errors.serviceRegionKeys}</FormHelperText>
        )}
      </Grid>

      <Grid item xs={12}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>
          Portfolio &amp; media
        </Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FileUpload
          label="Profile image *"
          hint="Logo or headshot · JPG/PNG/WebP up to 10MB"
          accept={IMAGE_ACCEPT}
          maxSizeMb={IMAGE_MAX_MB}
          disabled={submitting}
          value={files.profileImage}
          onSelect={(f) => selectFiles('profileImage', f, false)}
          onRemove={(id) => removeFile('profileImage', id)}
          error={errors.profileImage}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FileUpload
          label="Primary / cover image (optional)"
          hint="Your best work · up to 10MB"
          accept={IMAGE_ACCEPT}
          maxSizeMb={IMAGE_MAX_MB}
          disabled={submitting}
          value={files.primaryImage}
          onSelect={(f) => selectFiles('primaryImage', f, false)}
          onRemove={(id) => removeFile('primaryImage', id)}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FileUpload
          label="Gallery images (optional)"
          hint="Add several photos of your work · up to 10MB each"
          accept={IMAGE_ACCEPT}
          maxSizeMb={IMAGE_MAX_MB}
          multiple
          disabled={submitting}
          value={files.gallery}
          onSelect={(f) => selectFiles('gallery', f, true)}
          onRemove={(id) => removeFile('gallery', id)}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FileUpload
          label="Videos (optional)"
          hint="MP4/WebM/MOV · up to 500MB each"
          accept={VIDEO_ACCEPT}
          maxSizeMb={VIDEO_MAX_MB}
          multiple
          disabled={submitting}
          value={files.videos}
          onSelect={(f) => selectFiles('videos', f, true)}
          onRemove={(id) => removeFile('videos', id)}
        />
      </Grid>

      <Grid item xs={12}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>
          Social media (optional)
        </Typography>
      </Grid>
      {SOCIALS.map((s) => (
        <Grid item xs={12} sm={6} key={s.key}>
          <TextField
            label={s.label}
            fullWidth
            placeholder="https://…"
            disabled={submitting}
            value={values[s.key]}
            onChange={(e) => set(s.key, e.target.value)}
            error={!!errors[s.key]}
            helperText={errors[s.key]}
          />
        </Grid>
      ))}
    </Grid>
  );
}
