import { Box, Stack, FileUpload } from '@sinnapi/ui';
import type { RegistrationFields } from '../../hooks/useRegistrationFields';
import { fieldId } from '../../utils/fieldId';

const ACCEPT = 'application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg';
const MAX_SIZE_MB = 10;

type Props = { fields: RegistrationFields; disabled: boolean };

/** Required identity proof and the extra proof requested from registered businesses. */
export default function VerificationDocumentsSection({ fields, disabled }: Props) {
  const { values, errors, set } = fields;

  return (
    <Box component="section">
      <Stack spacing={2}>
        <Box id={fieldId('nationalIdFile')} tabIndex={-1}>
          <FileUpload
            label="National ID *"
            hint="Upload the ID for the person named under Business owner. If you need to show both sides, combine them into one PDF. PDF, PNG, JPG or JPEG up to 10 MB. Only Sinnapi’s review team can access it."
            accept={ACCEPT}
            maxSizeMb={MAX_SIZE_MB}
            disabled={disabled}
            value={
              values.nationalIdFile
                ? [
                    {
                      id: 'national-id',
                      name: values.nationalIdFile.name,
                      size: values.nationalIdFile.size,
                      status: 'selected' as const,
                    },
                  ]
                : []
            }
            error={errors.nationalIdFile}
            onSelect={(files) => set('nationalIdFile', files[0] ?? null)}
            onRemove={() => set('nationalIdFile', null)}
          />
        </Box>

        {values.applicantType === 'registered_business' && (
          <Box id={fieldId('businessRegistrationFile')} tabIndex={-1}>
            <FileUpload
              label="Business registration document *"
              hint="Upload your Certificate of Incorporation issued by the Uganda Registration Services Bureau (URSB). PDF, PNG, JPG or JPEG up to 10 MB. Only Sinnapi’s review team can access it."
              accept={ACCEPT}
              maxSizeMb={MAX_SIZE_MB}
              disabled={disabled}
              value={
                values.businessRegistrationFile
                  ? [
                      {
                        id: 'business-registration',
                        name: values.businessRegistrationFile.name,
                        size: values.businessRegistrationFile.size,
                        status: 'selected' as const,
                      },
                    ]
                  : []
              }
              error={errors.businessRegistrationFile}
              onSelect={(files) => set('businessRegistrationFile', files[0] ?? null)}
              onRemove={() => set('businessRegistrationFile', null)}
            />
          </Box>
        )}
      </Stack>
    </Box>
  );
}
