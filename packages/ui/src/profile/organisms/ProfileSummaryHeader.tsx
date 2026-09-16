'use client';
import type { ReactNode } from 'react';
import { Avatar, Box, ButtonBase, Card, Divider, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

export type ProfileSummaryHeaderProps = {
  src: string | null;
  name: string;
  subtitle?: string | null;
  /** Circular reads as a person, rounded as a business — as in `ImagePicker`. */
  shape?: 'circle' | 'rounded';
  /** Chips beside the name: status, visibility, roles. */
  badges?: ReactNode;
  /** Trailing controls, e.g. Preview and Copy link. */
  actions?: ReactNode;
  /** Makes the picture a shortcut to wherever it is changed. */
  onPictureClick?: () => void;
  pictureLabel?: string;
  /** Full-width strip under the headline, e.g. a `CompletenessMeter`. */
  children?: ReactNode;
};

/**
 * A compact "who this is" band that sits above a `ProfileWorkspace`.
 *
 * It replaces the tall `IdentityCard` on sectioned pages: the upload control moves
 * into its own section, so the header only has to *identify* — about a quarter
 * of the height, and it spans the page instead of taking a column. The gradient
 * is taken from the palette, so it adapts to dark mode without a second rule.
 */
export function ProfileSummaryHeader({
  src,
  name,
  subtitle,
  shape = 'circle',
  badges,
  actions,
  onPictureClick,
  pictureLabel = 'Change picture',
  children,
}: ProfileSummaryHeaderProps) {
  const avatar = (
    <Avatar
      src={src ?? undefined}
      alt={src ? name : undefined}
      variant={shape === 'circle' ? 'circular' : 'rounded'}
      sx={{
        width: { xs: 56, sm: 64 },
        height: { xs: 56, sm: 64 },
        borderRadius: shape === 'circle' ? '50%' : 2.5,
        fontWeight: 600,
        border: (t) => `2px solid ${t.palette.background.paper}`,
        boxShadow: (t) => `0 0 0 1px ${t.palette.divider}`,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </Avatar>
  );

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        mb: 3,
        background: (t) =>
          `linear-gradient(120deg, ${alpha(t.palette.primary.main, 0.1)}, ${alpha(
            t.palette.secondary.main,
            0.12,
          )} 60%, ${t.palette.background.paper})`,
      }}
    >
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
        >
          <Stack direction="row" alignItems="center" spacing={2} sx={{ minWidth: 0, flex: 1 }}>
            {onPictureClick ? (
              <ButtonBase
                onClick={onPictureClick}
                aria-label={pictureLabel}
                sx={{ borderRadius: shape === 'circle' ? '50%' : 2.5, flexShrink: 0 }}
              >
                {avatar}
              </ButtonBase>
            ) : (
              avatar
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ lineHeight: 1.25, wordBreak: 'break-word' }}>
                {name}
              </Typography>
              {subtitle && (
                <Typography variant="body2" color="text.secondary" noWrap>
                  {subtitle}
                </Typography>
              )}
              {badges && (
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                  {badges}
                </Stack>
              )}
            </Box>
          </Stack>
          {actions && (
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              sx={{ width: { xs: '100%', sm: 'auto' }, flexShrink: 0 }}
            >
              {actions}
            </Stack>
          )}
        </Stack>

        {children && (
          <>
            <Divider sx={{ my: 2 }} />
            {children}
          </>
        )}
      </Box>
    </Card>
  );
}
