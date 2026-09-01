import { Box, Checkbox, Chip, Stack, Typography } from '@sinnapi/ui';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';

type Props = {
  checked: boolean;
  onToggle: () => void;
  label: string;
  /** The price or the category — the fact that tells two similar rows apart. */
  meta?: string | null;
  /** Rendered to the right of the label — a "Recommended" or "Draft" chip. */
  badge?: ReactNode;
  /** Tier rows sit indented under their package. */
  indent?: boolean;
  disabled?: boolean;
  disabledReason?: string;
};

/**
 * One tickable thing an offer can be attached to.
 *
 * The whole row is the hit target, not just the checkbox. This list is worked
 * through on a phone as often as a desktop — a vendor setting up a weekend sale
 * is rarely at a laptop — and a 20px checkbox is the difference between ticking
 * four packages and ticking three and one you did not mean.
 *
 * A disabled row stays visible with its reason rather than being filtered out.
 * A vendor looking for "Full Day Wedding" and not finding it concludes the
 * picker is broken; a vendor seeing it greyed with "Not published" learns the
 * thing they actually need to do, on the screen where they are.
 */
export default function OfferTargetRow({
  checked,
  onToggle,
  label,
  meta,
  badge,
  indent,
  disabled,
  disabledReason,
}: Props) {
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      onClick={disabled ? undefined : onToggle}
      sx={{
        pl: indent ? { xs: 3, sm: 4.5 } : 1,
        pr: 1,
        py: 0.75,
        borderRadius: 1.5,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        bgcolor: checked
          ? (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.08)
          : 'transparent',
        '&:hover': disabled
          ? undefined
          : {
              bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.2 : 0.1),
            },
      }}
    >
      <Checkbox
        size="small"
        checked={checked}
        disabled={disabled}
        // The row handles the click; letting the checkbox handle it too would
        // fire the toggle twice and leave the tick where it started.
        onClick={(event) => event.stopPropagation()}
        onChange={onToggle}
        sx={{ p: 0.5 }}
      />

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: indent ? 400 : 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </Typography>
          {badge}
        </Stack>
        {(meta || disabledReason) && (
          <Typography variant="caption" color="text.secondary">
            {disabledReason ?? meta}
          </Typography>
        )}
      </Box>

      {checked && <Chip size="small" color="primary" label="Included" sx={{ flexShrink: 0 }} />}
    </Stack>
  );
}
