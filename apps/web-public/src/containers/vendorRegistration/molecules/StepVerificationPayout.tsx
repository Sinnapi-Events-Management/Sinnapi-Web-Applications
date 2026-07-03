import { Grid, TextField, MenuItem, Typography, FileUpload, Alert } from '@sinnapi/ui';
import { DOC_ACCEPT, DOC_MAX_MB } from '../data/options';
import type { RegistrationApi } from '../hooks/useVendorRegistration';

type Props = { api: RegistrationApi };

/** Step 3 — identity/verification documents and (secure) payout details. */
export default function StepVerificationPayout({ api }: Props) {
  const { values, errors, set, submitting, files, selectFiles, removeFile } = api;
  const isBusiness = values.applicantType === 'registered_business';

  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12} sm={6}>
        <FileUpload
          label="National ID *"
          hint="PNG, JPG or PDF up to 20MB · kept private"
          accept={DOC_ACCEPT}
          maxSizeMb={DOC_MAX_MB}
          disabled={submitting}
          value={files.nationalId}
          onSelect={(f) => selectFiles('nationalId', f, false)}
          onRemove={(id) => removeFile('nationalId', id)}
          error={errors.nationalId}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FileUpload
          label="Proof of work (optional)"
          hint="A PDF portfolio or reference letter · up to 20MB"
          accept="application/pdf"
          maxSizeMb={DOC_MAX_MB}
          disabled={submitting}
          value={files.proofOfWork}
          onSelect={(f) => selectFiles('proofOfWork', f, false)}
          onRemove={(id) => removeFile('proofOfWork', id)}
        />
      </Grid>

      {isBusiness && (
        <>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Business registration number (optional)"
              fullWidth
              disabled={submitting}
              value={values.businessRegNumber}
              onChange={(e) => set('businessRegNumber', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Tax Identification Number (optional)"
              fullWidth
              disabled={submitting}
              value={values.taxId}
              onChange={(e) => set('taxId', e.target.value)}
            />
          </Grid>
        </>
      )}

      <Grid item xs={12} sm={6}>
        <TextField
          label="iCandy Masterclass alumni? (optional)"
          select
          fullWidth
          disabled={submitting}
          value={values.icandyAlumni}
          onChange={(e) => set('icandyAlumni', e.target.value as typeof values.icandyAlumni)}
        >
          <MenuItem value="">
            <em>Prefer not to say</em>
          </MenuItem>
          <MenuItem value="yes">Yes</MenuItem>
          <MenuItem value="no">No</MenuItem>
        </TextField>
      </Grid>

      <Grid item xs={12}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>
          Payout details
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Alert severity="info" variant="outlined">
          Your bank details are stored securely and are only used to pay you once bookings are
          completed through escrow.
        </Alert>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Bank name"
          fullWidth
          required
          disabled={submitting}
          value={values.bankName}
          onChange={(e) => set('bankName', e.target.value)}
          error={!!errors.bankName}
          helperText={errors.bankName}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Account name"
          fullWidth
          required
          disabled={submitting}
          value={values.accountName}
          onChange={(e) => set('accountName', e.target.value)}
          error={!!errors.accountName}
          helperText={errors.accountName}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Account number"
          fullWidth
          required
          disabled={submitting}
          value={values.accountNumber}
          onChange={(e) => set('accountNumber', e.target.value)}
          error={!!errors.accountNumber}
          helperText={errors.accountNumber}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Branch (optional)"
          fullWidth
          disabled={submitting}
          value={values.branch}
          onChange={(e) => set('branch', e.target.value)}
        />
      </Grid>
    </Grid>
  );
}
