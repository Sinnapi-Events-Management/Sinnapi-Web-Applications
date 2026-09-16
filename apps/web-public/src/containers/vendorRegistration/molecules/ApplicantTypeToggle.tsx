import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@sinnapi/ui/atoms';
import { APPLICANT_TYPES } from '../data/options';
import type { ApplicantType } from '../data/schema';

type Props = { value: ApplicantType; disabled?: boolean; onChange: (next: ApplicantType) => void };

const LABEL_ID = 'vendor-application-applicantType-label';

/** "Who is applying?" as a full-width two-way segmented choice. */
export default function ApplicantTypeToggle({ value, disabled, onChange }: Props) {
  return (
    <Box>
      <Typography id={LABEL_ID} variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Who is applying? *
      </Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        color="primary"
        value={value}
        disabled={disabled}
        aria-labelledby={LABEL_ID}
        // A segmented choice has no "nothing selected" state: clicking the active
        // option again reports null, which is ignored rather than clearing it.
        onChange={(_, next: ApplicantType | null) => next && onChange(next)}
      >
        {APPLICANT_TYPES.map((option) => (
          <ToggleButton key={option.value} value={option.value} sx={{ lineHeight: 1.2, py: 1.25 }}>
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
