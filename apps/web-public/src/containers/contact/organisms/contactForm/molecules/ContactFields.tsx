import { Grid, TextField, MenuItem } from '@sinnapi/ui';
import { INQUIRY_TYPES } from '../data/inquiryTypes';

interface ContactFieldsProps {
  errors: Record<string, string>;
  disabled?: boolean;
}

/**
 * The contact form's input grid. Name/email pair on one row, phone/topic on the
 * next, message full-width — a compact two-column layout on desktop that stacks
 * on mobile. Purely presentational; validation state is passed down via `errors`.
 */
export default function ContactFields({ errors, disabled }: ContactFieldsProps) {
  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12} sm={6}>
        <TextField
          name="name"
          label="Your name"
          fullWidth
          disabled={disabled}
          error={!!errors.name}
          helperText={errors.name}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          name="email"
          type="email"
          label="Email"
          fullWidth
          disabled={disabled}
          error={!!errors.email}
          helperText={errors.email}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          name="phone"
          type="tel"
          label="Phone (optional)"
          fullWidth
          disabled={disabled}
          error={!!errors.phone}
          helperText={errors.phone}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          name="inquiryType"
          label="How can we help?"
          select
          fullWidth
          defaultValue=""
          disabled={disabled}
          error={!!errors.inquiryType}
          helperText={errors.inquiryType}
          required
        >
          {INQUIRY_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <TextField
          name="message"
          label="Message"
          fullWidth
          multiline
          minRows={4}
          disabled={disabled}
          error={!!errors.message}
          helperText={errors.message}
          required
        />
      </Grid>
    </Grid>
  );
}
