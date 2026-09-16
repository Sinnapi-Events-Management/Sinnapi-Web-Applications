import { Box, Stack, Step, StepButton, Stepper, Typography } from '@sinnapi/ui';
import { STEPS, type StepKey } from '../../schema/steps';
import CompletionMeter from '../atoms/CompletionMeter';

type Props = {
  index: number;
  percent: number;
  done: Record<StepKey, boolean>;
  onGoTo: (index: number) => void;
};

/**
 * Progress header: a clickable stepper on desktop, and on phones the same
 * information as text plus the meter. A five-node stepper squeezed into 360px
 * is unreadable, and "Step 2 of 4" is not. The meter sits under the stepper, not
 * beside it: six labels already fill the setup dialog's width on their own.
 */
export default function WizardProgress({ index, percent, done, onGoTo }: Props) {
  return (
    <Stack spacing={2} alignItems="stretch" sx={{ mb: { xs: 2.5, md: 3.5 } }}>
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        {/* Gold, to match the completeness bar beneath it. */}
        <Stepper
          nonLinear
          activeStep={index}
          sx={{
            '& .MuiStepIcon-root.Mui-active, & .MuiStepIcon-root.Mui-completed': {
              color: 'secondary.main',
            },
          }}
        >
          {STEPS.map((s, i) => (
            <Step key={s.key} completed={done[s.key]}>
              <StepButton
                onClick={() => onGoTo(i)}
                sx={{ '& .MuiStepLabel-label': { whiteSpace: 'nowrap' } }}
              >
                {s.label}
              </StepButton>
            </Step>
          ))}
        </Stepper>
      </Box>

      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <Typography variant="caption" color="text.secondary">
          Step {index + 1} of {STEPS.length} · {STEPS[index].label}
        </Typography>
      </Box>

      <CompletionMeter percent={percent} />
    </Stack>
  );
}
