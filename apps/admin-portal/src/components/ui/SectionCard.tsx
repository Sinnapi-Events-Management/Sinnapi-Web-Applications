import { Card, CardContent, Box, Stack, Typography, alpha } from '@sinnapi/ui';

type AccentColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

type Props = {
  title: string;
  icon?: React.ReactNode;
  /** Tint used for the icon badge and the top accent bar. */
  accent?: AccentColor;
  /** Optional element rendered on the right of the header (e.g. a chip/button). */
  action?: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  sx?: object;
};

/**
 * Titled content card with a coloured icon badge and a thin accent bar — the
 * building block for the application detail sections. Shared so other admin
 * detail screens can present grouped information the same way.
 */
export default function SectionCard({
  title,
  icon,
  accent = 'primary',
  action,
  subtitle,
  children,
  sx,
}: Props) {
  return (
    <Card
      variant="outlined"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
        '&::before': {
          content: '""',
          position: 'absolute',
          insetInline: 0,
          top: 0,
          height: 3,
          bgcolor: `${accent}.main`,
        },
        ...sx,
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
          {icon && (
            <Box
              sx={{
                display: 'grid',
                placeItems: 'center',
                width: 40,
                height: 40,
                borderRadius: 2,
                flexShrink: 0,
                color: `${accent}.main`,
                bgcolor: (t) => alpha(t.palette[accent].main, 0.12),
              }}
            >
              {icon}
            </Box>
          )}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}
