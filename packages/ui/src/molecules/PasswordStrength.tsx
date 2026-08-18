'use client';
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

/** How many segments the meter draws — also the maximum score. */
const SEGMENTS = 4;

type Band = { label: string; accent: 'error' | 'warning' | 'info' | 'success' };

/**
 * Score → wording and tint. Index 0 is only ever reached by a non-empty
 * password, because the meter renders nothing at all for an empty field.
 */
const BANDS: Band[] = [
  { label: 'Too weak', accent: 'error' },
  { label: 'Weak', accent: 'error' },
  { label: 'Fair', accent: 'warning' },
  { label: 'Good', accent: 'info' },
  { label: 'Strong', accent: 'success' },
];

/**
 * A deliberately simple, dependency-free estimate of password quality.
 *
 * It is guidance, not a gate: the schema's minimum length is what actually
 * decides whether a password is accepted. Shipping zxcvbn to score a field the
 * user sees for four seconds would cost more bundle than the advice is worth.
 *
 * One point each for reaching the required length, comfortably exceeding it,
 * mixing letter cases with digits, and adding a symbol.
 */
export function scorePassword(value: string, minLength: number): number {
  if (!value) return 0;
  let score = 0;
  if (value.length >= minLength) score += 1;
  if (value.length >= minLength + 4) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(score, SEGMENTS);
}

export type PasswordStrengthProps = {
  /** The password being typed. An empty value renders nothing. */
  value: string;
  /** The length the schema requires, so the meter agrees with validation. */
  minLength: number;
};

/**
 * Segmented strength meter for a new-password field.
 *
 * Sits under the input rather than replacing its helper text: the helper states
 * the rule ("at least 8 characters") and this states how the current attempt is
 * doing against it. Both are needed — the rule alone gives no feedback, and the
 * meter alone leaves the user guessing what would satisfy the form.
 */
export function PasswordStrength({ value, minLength }: PasswordStrengthProps) {
  if (!value) return null;

  const score = scorePassword(value, minLength);
  const { label, accent } = BANDS[score];

  return (
    <Stack spacing={0.75} sx={{ mt: -0.5 }} aria-live="polite">
      <Stack direction="row" spacing={0.5}>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <Box
            key={i}
            sx={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              transition: 'background-color .2s',
              bgcolor: (t) =>
                i < score ? t.palette[accent].main : alpha(t.palette.text.primary, 0.12),
            }}
          />
        ))}
      </Stack>
      <Typography variant="caption" sx={{ color: `${accent}.main`, fontWeight: 600 }}>
        {label}
      </Typography>
    </Stack>
  );
}
