import { Box, LinearProgress, Stack, Typography } from '@sinnapi/ui';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { PASSWORD_RULES, PASSWORD_STRENGTH_LABELS } from '../../schema';

type Props = {
  /** The password being typed. Empty renders the checklist in its unmet state. */
  value: string;
  /** 0–4, from `passwordScore`. */
  score: number;
};

/** Meter tint — red through green as the score climbs. */
const SCORE_COLORS = ['error', 'error', 'warning', 'info', 'success'] as const;

/**
 * Live feedback under the new-password field: a strength bar plus the rules,
 * ticked as they're satisfied. Purely presentational — the score and the rules
 * both come from the schema, so what's displayed can't drift from what's
 * enforced.
 */
export default function PasswordStrength({ value, score }: Props) {
  const color = SCORE_COLORS[Math.min(score, SCORE_COLORS.length - 1)];

  return (
    <Box aria-live="polite">
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.25 }}>
        <LinearProgress
          variant="determinate"
          value={(score / 4) * 100}
          color={color}
          sx={{ flex: 1, height: 6, borderRadius: 3 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 68 }}>
          {value ? PASSWORD_STRENGTH_LABELS[score] : ''}
        </Typography>
      </Stack>

      <Stack component="ul" spacing={0.5} sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {PASSWORD_RULES.map((rule) => {
          const met = rule.test(value);
          return (
            <Stack
              key={rule.key}
              component="li"
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ color: met ? 'success.main' : 'text.secondary' }}
            >
              {met ? (
                <CheckCircleIcon sx={{ fontSize: 16 }} />
              ) : (
                <RadioButtonUncheckedIcon sx={{ fontSize: 16, opacity: 0.5 }} />
              )}
              <Typography variant="caption">{rule.label}</Typography>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}
