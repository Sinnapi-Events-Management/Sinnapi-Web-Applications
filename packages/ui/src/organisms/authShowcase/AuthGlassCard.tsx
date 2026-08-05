'use client';
import { Stack, type StackProps } from '../../atoms/Layout';
import { alpha } from '../../system';

/**
 * Frosted-glass surface used for the auth showcase card. Exported on its own so
 * other "content over media" panels can reuse the exact same glass treatment.
 */
export function AuthGlassCard({ sx, ...rest }: StackProps) {
  return (
    <Stack
      {...rest}
      sx={[
        {
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          p: { md: 4, lg: 5 },
          borderRadius: 4,
          color: 'common.white',
          bgcolor: (t) => alpha(t.palette.common.white, 0.08),
          // Dimensional glass: a faint diagonal sheen rather than a flat fill.
          backgroundImage: (t) =>
            `linear-gradient(135deg, ${alpha(t.palette.common.white, 0.16)} 0%, ${alpha(
              t.palette.common.white,
              0.04,
            )} 58%)`,
          border: (t) => `1px solid ${alpha(t.palette.common.white, 0.22)}`,
          backdropFilter: 'blur(18px) saturate(135%)',
          WebkitBackdropFilter: 'blur(18px) saturate(135%)',
          // Lift shadow + hairline top sheen (inset) for a real glass edge.
          boxShadow: (t) =>
            `0 28px 70px ${alpha(t.palette.primary.dark, 0.42)}, inset 0 1px 0 ${alpha(
              t.palette.common.white,
              0.35,
            )}`,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
}
