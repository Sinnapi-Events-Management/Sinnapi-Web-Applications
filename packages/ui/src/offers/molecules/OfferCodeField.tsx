'use client';
import { Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { formatAmount } from '../../molecules/money';
import { offerBlockCopy } from '../schema/offerCopy';
import type { OfferPreview } from '../types';

export type OfferCodeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  /** Runs the server-side check. The field never decides validity itself. */
  onApply: () => void;
  /** Clears an applied code and its preview. */
  onClear: () => void;
  isChecking?: boolean;
  /** The single row `preview_discount` returns, valid or not. */
  preview?: OfferPreview | null;
  currency?: string;
  /** Names the tier and package, so a refusal can say which one it means. */
  context?: { tierName?: string | null; packageName?: string | null };
  disabled?: boolean;
  label?: string;
};

/**
 * Where a client types a discount code.
 *
 * PRESENTATIONAL ON PURPOSE — IT NEVER DECIDES ANYTHING
 * Validity comes from `preview_discount` and nothing else. The field has no
 * regex, no expiry check and no opinion about minimum spend, because a browser
 * that decides a code is good is a browser making a promise the server may
 * refuse three seconds later. That refusal, arriving after the client has moved
 * on, is worse than a slower answer here.
 *
 * It is also why this lives in the kit while the hook behind it does not: every
 * app reaches Supabase through its own client, and a component that imported one
 * could only ever work in the app it was written for.
 *
 * THE REFUSAL IS THE POINT
 * `discount_block_reason` distinguishes thirteen failures so this field can say
 * which one. "That code does not cover the Silver tier — try another tier" ends
 * with the client doing something; "Invalid code" ends with them emailing
 * support about a code that works perfectly well.
 *
 * The applied state replaces the input rather than sitting under it. A code
 * that has been accepted is a decision, not a draft, and leaving an editable
 * box behind it invites a client to change it without re-checking.
 */
export function OfferCodeField({
  value,
  onChange,
  onApply,
  onClear,
  isChecking,
  preview,
  currency = 'UGX',
  context,
  disabled,
  label = 'Discount code',
}: OfferCodeFieldProps) {
  const applied = preview?.is_valid === true;
  const refused = preview != null && preview.is_valid === false;

  if (applied) {
    return (
      <Box
        sx={{
          p: 1.75,
          borderRadius: 2,
          border: '1px solid',
          borderColor: (t) => alpha(t.palette.success.main, 0.45),
          bgcolor: (t) => alpha(t.palette.success.main, t.palette.mode === 'dark' ? 0.14 : 0.07),
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="flex-start">
          <CheckCircleRoundedIcon sx={{ color: 'success.main', fontSize: 20, mt: '1px' }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {preview?.title ?? value} applied
            </Typography>
            <Typography variant="body2" color="success.main" sx={{ fontWeight: 700 }}>
              You save {formatAmount(preview?.discount_amount, currency)}
            </Typography>
            {preview?.terms && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.5 }}
              >
                {preview.terms}
              </Typography>
            )}
          </Box>
          <Button size="small" color="inherit" onClick={onClear} startIcon={<CloseRoundedIcon />}>
            Remove
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={0.75}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-start">
        <TextField
          fullWidth
          size="small"
          label={label}
          value={value}
          disabled={disabled}
          error={refused}
          onChange={(event) => onChange(event.target.value)}
          // Enter applies. A client who has typed a code and pressed Enter has
          // asked for it to be checked; making them find the button is friction
          // on the one interaction this field exists for.
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (value.trim()) onApply();
            }
          }}
          inputProps={{
            autoCapitalize: 'characters',
            autoCorrect: 'off',
            spellCheck: false,
            // Codes are read off posters and typed from memory. Uppercase is
            // presentational only — the server matches case-insensitively.
            style: { textTransform: 'uppercase', letterSpacing: '0.06em' },
          }}
        />
        <Button
          variant="outlined"
          onClick={onApply}
          disabled={disabled || isChecking || !value.trim()}
          // Matches the small TextField's height so the pair sits on one line
          // from `sm` up without a wrapper that would break the column layout.
          sx={{ height: 40, minWidth: 96, flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}
          startIcon={isChecking ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          {isChecking ? 'Checking' : 'Apply'}
        </Button>
      </Stack>

      {refused && (
        <Typography variant="caption" color="error.main">
          {offerBlockCopy(preview?.reason, context)}
        </Typography>
      )}
    </Stack>
  );
}
