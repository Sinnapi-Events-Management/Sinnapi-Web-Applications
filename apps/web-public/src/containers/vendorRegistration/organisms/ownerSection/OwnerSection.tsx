import { Box, Grid } from '@sinnapi/ui/atoms';
import type { RegistrationFields } from '../../hooks/useRegistrationFields';
import FormSectionHeading from '../../atoms/FormSectionHeading';
import RegistrationTextField from '../../molecules/RegistrationTextField';

type Props = { fields: RegistrationFields; disabled: boolean };

/** The business owner and how to reach them. Email and phone sit side by side from tablet up. */
export default function OwnerSection({ fields, disabled }: Props) {
  return (
    <Box component="section">
      <FormSectionHeading
        title="Business owner"
        caption="We’ll use these details to contact you about your application."
      />
      <Grid container spacing={2.5}>
        <Grid item xs={12}>
          <RegistrationTextField
            name="ownerFullName"
            fields={fields}
            label="Business owner full name"
            autoComplete="name"
            required
            disabled={disabled}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RegistrationTextField
            name="ownerEmail"
            fields={fields}
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            disabled={disabled}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RegistrationTextField
            name="ownerPhone"
            fields={fields}
            label="Phone number"
            type="tel"
            autoComplete="tel"
            required
            disabled={disabled}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
