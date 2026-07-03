import { Box, Stepper, Step, StepLabel, Typography, LinearProgress } from '@sinnapi/ui';
import { STEPS } from '../data/steps';

type Props = { activeStep: number };

/**
 * Progress header for the application. Horizontal labelled Stepper on desktop;
 * a compact "Step X of N" + progress bar on mobile (per 2026 wizard guidance —
 * textual progress reads better on small screens than a cramped node row).
 */
export default function RegistrationStepper({ activeStep }: Props) {
  const total = STEPS.length;
  return (
    <Box sx={{ mb: { xs: 3, md: 4 } }}>
      {/* Desktop */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((s) => (
            <Step key={s.label}>
              <StepLabel>{s.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Mobile */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {STEPS[activeStep].label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Step {activeStep + 1} of {total}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {STEPS[activeStep].caption}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={((activeStep + 1) / total) * 100}
          sx={{ mt: 1, borderRadius: 1, height: 6 }}
        />
      </Box>
    </Box>
  );
}
