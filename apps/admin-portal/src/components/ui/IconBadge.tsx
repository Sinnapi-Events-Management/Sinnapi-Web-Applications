import { Box, alpha } from '@sinnapi/ui';

type AccentColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

type Props = {
  /** Tint for the icon and its translucent background. */
  accent?: AccentColor;
  /** Badge edge length in px. */
  size?: number;
  /** Rendered glyph size in px. Defaults to ~55% of the badge. */
  iconSize?: number;
  /** Circular instead of the default rounded square. */
  circular?: boolean;
  children: React.ReactNode;
  sx?: object;
};

/**
 * Tinted icon badge — a coloured glyph on a soft same-hue background. The visual
 * signature shared by SectionCard headers and confirmation dialogs, extracted so
 * the tint maths lives in one place and stays consistent everywhere.
 */
export default function IconBadge({
  accent = 'secondary',
  size = 40,
  iconSize,
  circular = false,
  children,
  sx,
}: Props) {
  return (
    <Box
      sx={{
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: circular ? '50%' : 2,
        color: `${accent}.main`,
        bgcolor: (t) => alpha(t.palette[accent].main, 0.12),
        '& > svg': { fontSize: iconSize ?? Math.round(size * 0.55) },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
