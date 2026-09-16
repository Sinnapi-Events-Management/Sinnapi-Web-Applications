import { Box, Grid } from '@sinnapi/ui/atoms';
import type { ReferenceOption } from '@/lib/queries';
import type { RegistrationFields } from '../../hooks/useRegistrationFields';
import { fieldId } from '../../utils/fieldId';
import FormSectionHeading from '../../atoms/FormSectionHeading';
import RegistrationTextField from '../../molecules/RegistrationTextField';
import ApplicantTypeToggle from '../../molecules/ApplicantTypeToggle';
import ServicesField from '../../molecules/ServicesField';

type Props = { fields: RegistrationFields; categories: ReferenceOption[]; disabled: boolean };

/** The business: its name, who is applying for it, and the services it offers. */
export default function BusinessSection({ fields, categories, disabled }: Props) {
  const { values, errors, set } = fields;

  return (
    <Box component="section">
      <FormSectionHeading title="Your business" caption="How clients will find and know you." />
      <Grid container spacing={2.5}>
        <Grid item xs={12}>
          <RegistrationTextField
            name="businessName"
            fields={fields}
            label="Business name"
            autoComplete="organization"
            required
            disabled={disabled}
          />
        </Grid>
        <Grid item xs={12}>
          <ApplicantTypeToggle
            value={values.applicantType}
            disabled={disabled}
            onChange={(next) => set('applicantType', next)}
          />
        </Grid>
        <Grid item xs={12}>
          <ServicesField
            id={fieldId('serviceCategoryKeys')}
            categories={categories}
            value={values.serviceCategoryKeys}
            error={errors.serviceCategoryKeys}
            disabled={disabled}
            onChange={(keys) => set('serviceCategoryKeys', keys)}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
