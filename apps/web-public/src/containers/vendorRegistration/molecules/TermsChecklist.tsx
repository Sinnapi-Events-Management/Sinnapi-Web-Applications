import { Box, Checkbox, FormControlLabel, FormHelperText, Stack } from '@sinnapi/ui/atoms';
import { TERMS } from '../data/options';
import type { RegistrationFields } from '../hooks/useRegistrationFields';
import { fieldId } from '../utils/fieldId';
import TermLabel from '../atoms/TermLabel';

type Props = { fields: RegistrationFields; disabled: boolean };

/** The four required acceptances, each with its own error beneath it. */
export default function TermsChecklist({ fields, disabled }: Props) {
  const { values, errors, set } = fields;

  return (
    <Stack spacing={1}>
      {TERMS.map((term) => (
        <Box key={term.key}>
          <FormControlLabel
            sx={{ alignItems: 'flex-start', m: 0 }}
            control={
              <Checkbox
                id={fieldId(term.key)}
                disabled={disabled}
                checked={values[term.key]}
                onChange={(e) => set(term.key, e.target.checked)}
                sx={{ pt: 0.25 }}
              />
            }
            label={<TermLabel label={term.label} href={term.href} />}
          />
          {errors[term.key] && (
            <FormHelperText error sx={{ ml: 4 }}>
              {errors[term.key]}
            </FormHelperText>
          )}
        </Box>
      ))}
    </Stack>
  );
}
