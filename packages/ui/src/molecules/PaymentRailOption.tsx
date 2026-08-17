'use client';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ShieldIcon from '@mui/icons-material/Shield';
import HandshakeIcon from '@mui/icons-material/Handshake';
import CheckIcon from '@mui/icons-material/Check';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { PaymentRailSpec } from './paymentTerms';

export type PaymentRailOptionProps = {
  spec: PaymentRailSpec;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  /** The headline figure for this rail — `UGX 226,600`, or a range. */
  priceLabel?: string;
  /** What is added on top, when anything is. Sits under the price. */
  extraLabel?: string | null;
  /** Dims the price while a new preview is loading, without moving anything. */
  isPricing?: boolean;
};

/**
 * One payment rail, as something to choose between rather than a line in a
 * dropdown.
 *
 * The card carries its own consequences — what the client gets and what it
 * costs them — because this is the moment the two rails actually differ, and a
 * picker that shows only two names asks the client to decide between things it
 * has not described. The caveats are given the same visual weight as the
 * benefits for the same reason: on the off-platform rail the caveat *is* the
 * decision.
 */
export function PaymentRailOption({
  spec,
  selected,
  onSelect,
  disabled,
  priceLabel,
  extraLabel,
  isPricing,
}: PaymentRailOptionProps) {
  return (
    <Box
      role="radio"
      aria-checked={selected}
      aria-label={spec.label}
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onSelect()}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      sx={{
        flex: '1 1 260px',
        p: 2,
        borderRadius: 2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        border: (t) =>
          `1.5px solid ${selected ? t.palette.secondary.main : alpha(t.palette.divider, 0.9)}`,
        bgcolor: (t) => (selected ? alpha(t.palette.secondary.main, 0.07) : 'transparent'),
        transition: 'border-color .15s, background-color .15s',
        '&:hover': { borderColor: (t) => (disabled ? undefined : t.palette.secondary.main) },
        '&:focus-visible': {
          outline: (t) => `2px solid ${t.palette.secondary.main}`,
          outlineOffset: 2,
        },
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <Box
          sx={{ color: selected ? 'secondary.main' : 'text.disabled', display: 'flex', pt: 0.25 }}
        >
          {spec.rail === 'escrow' ? <ShieldIcon /> : <HandshakeIcon />}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={selected ? 700 : 600}>
            {spec.label}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {spec.tagline}
          </Typography>

          {priceLabel && (
            <Box sx={{ mt: 1.25, opacity: isPricing ? 0.45 : 1, transition: 'opacity .15s' }}>
              <Typography variant="h6" fontWeight={700}>
                {priceLabel}
              </Typography>
              <Typography variant="caption" color={extraLabel ? 'warning.main' : 'success.main'}>
                {extraLabel ?? 'Exactly the price you agreed'}
              </Typography>
            </Box>
          )}
        </Box>
        {selected && <Chip size="small" color="secondary" label="Selected" />}
      </Stack>

      <Stack spacing={0.75} sx={{ mt: 1.75 }}>
        {spec.benefits.map((text) => (
          <PointRow key={text} text={text} kind="benefit" />
        ))}
        {spec.caveats.map((text) => (
          <PointRow key={text} text={text} kind="caveat" />
        ))}
      </Stack>
    </Box>
  );
}

/** One consequence of choosing this rail. */
function PointRow({ text, kind }: { text: string; kind: 'benefit' | 'caveat' }) {
  const isBenefit = kind === 'benefit';
  return (
    <Stack direction="row" spacing={0.75} alignItems="flex-start">
      <Box
        component={isBenefit ? CheckIcon : InfoOutlinedIcon}
        sx={{ fontSize: 15, mt: '2px', color: isBenefit ? 'success.main' : 'warning.main' }}
      />
      <Typography variant="caption" color="text.secondary">
        {text}
      </Typography>
    </Stack>
  );
}
