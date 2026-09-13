'use client';
import type { KeyboardEvent, Ref } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { CheckoutRailOption } from '../rails';
import { ProviderLogo } from '../atoms/ProviderLogo';
import { RadioIndicator } from '../atoms/RadioIndicator';

export type CheckoutRailCardProps = {
  rail: CheckoutRailOption;
  selected: boolean;
  disabled?: boolean;
  tabIndex: 0 | -1;
  optionRef: Ref<HTMLDivElement>;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

/**
 * One way to pay, as a full-width row: the dot, what it is, and whose mark.
 *
 * A row rather than the old 2×2 grid of tiles. The grid gave each option half
 * the width, so the caption truncated on every phone under ~400px and the
 * two card options read as near-duplicates. A row keeps the label and caption
 * whole at any width, and puts the brand marks at the edge where the eye
 * scans for "is my method here" — which is what logos are for.
 *
 * Keyboard and focus rules live in `useRadioGroupNavigation`; this only
 * renders the state it is handed.
 */
export function CheckoutRailCard({
  rail,
  selected,
  disabled,
  tabIndex,
  optionRef,
  onSelect,
  onKeyDown,
}: CheckoutRailCardProps) {
  return (
    <Box
      ref={optionRef}
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled || undefined}
      aria-label={`${rail.label}. ${rail.caption}${rail.notice ? `. ${rail.notice}` : ''}`}
      tabIndex={tabIndex}
      onClick={() => !disabled && onSelect()}
      onKeyDown={onKeyDown}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1.5, sm: 2 },
        px: { xs: 1.5, sm: 2 },
        py: 1.5,
        borderRadius: 3,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        outline: 'none',
        // 1px border plus an inset ring when selected, so selecting never
        // changes the box size and nothing below it shifts.
        border: '1px solid',
        borderColor: (t) =>
          selected ? t.palette.secondary.main : alpha(t.palette.text.primary, 0.14),
        boxShadow: (t) => (selected ? `inset 0 0 0 1px ${t.palette.secondary.main}` : 'none'),
        bgcolor: (t) => (selected ? alpha(t.palette.secondary.main, 0.08) : 'transparent'),
        transition: 'border-color .15s, background-color .15s, box-shadow .15s',
        '&:hover': disabled
          ? undefined
          : {
              borderColor: (t) => alpha(t.palette.secondary.main, selected ? 1 : 0.6),
              bgcolor: (t) =>
                selected
                  ? alpha(t.palette.secondary.main, 0.1)
                  : alpha(t.palette.text.primary, 0.03),
            },
        '&:focus-visible': {
          boxShadow: (t) =>
            `inset 0 0 0 1px ${t.palette.secondary.main}, 0 0 0 3px ${alpha(t.palette.secondary.main, 0.35)}`,
        },
      }}
    >
      <RadioIndicator checked={selected} />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" flexWrap="wrap" columnGap={1} rowGap={0.25}>
          <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.3 }}>
            {rail.label}
          </Typography>
          {rail.notice && (
            <Chip
              label={rail.notice}
              size="small"
              variant="outlined"
              sx={{ height: 22, fontSize: '0.875rem', color: 'text.secondary' }}
            />
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {rail.caption}
        </Typography>
      </Box>

      <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0 }} aria-hidden>
        {rail.logos.map((id) => (
          <ProviderLogo key={id} id={id} decorative />
        ))}
      </Stack>
    </Box>
  );
}
