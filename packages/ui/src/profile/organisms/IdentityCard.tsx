'use client';
import type { ReactNode } from 'react';
import { Alert, Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ImagePicker, type ImagePickerProps } from '../molecules/ImagePicker';

export type IdentityCardProps = Pick<
  ImagePickerProps,
  | 'src'
  | 'name'
  | 'busy'
  | 'maxSizeMb'
  | 'shape'
  | 'subject'
  | 'helperText'
  | 'onSelect'
  | 'onRemove'
> & {
  /** Secondary line under the name — usually the email or the trading city. */
  subtitle?: string | null;
  /** Upload failure, rendered under the picker so it sits next to its cause. */
  error?: string | null;
  /** Chips shown under the name: status, roles, plan. */
  badges?: ReactNode;
  /** Anything else the surface needs below the badges. */
  children?: ReactNode;
};

/**
 * The "who this is" card: picture, name, one secondary line and any badges.
 *
 * The tinted band gives the card a header without costing a second surface or an
 * image asset, and the picture straddles it — the layout every portal's profile
 * page uses, which is exactly why it lives here rather than three times over.
 *
 * The card is deliberately dumb: it takes an already-wired picker and shows an
 * error if there is one. Which record the image lands on is `useProfileImageUpload`'s
 * business, and the surface above chooses which.
 */
export function IdentityCard({
  src,
  name,
  subtitle,
  busy,
  error,
  maxSizeMb,
  shape,
  subject,
  helperText,
  badges,
  children,
  onSelect,
  onRemove,
}: IdentityCardProps) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Box
        sx={{
          height: 88,
          background: (t) =>
            `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.18)}, ${alpha(
              t.palette.secondary.main,
              0.22,
            )})`,
        }}
      />
      <CardContent sx={{ pt: 0, pb: { xs: 2.5, sm: 3 }, px: { xs: 2.5, sm: 3 } }}>
        <Box sx={{ mt: -7 }}>
          <ImagePicker
            src={src}
            name={name}
            busy={busy}
            maxSizeMb={maxSizeMb}
            shape={shape}
            subject={subject}
            helperText={helperText}
            onSelect={onSelect}
            onRemove={onRemove}
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={0.5} alignItems="center" sx={{ mt: 2.5 }}>
          <Typography variant="h6" textAlign="center" sx={{ wordBreak: 'break-word' }}>
            {name}
          </Typography>
          {subtitle && (
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
              sx={{ wordBreak: 'break-all' }}
            >
              {subtitle}
            </Typography>
          )}
        </Stack>

        {badges && (
          <Stack
            direction="row"
            spacing={0.75}
            justifyContent="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ mt: 2 }}
          >
            {badges}
          </Stack>
        )}

        {children}
      </CardContent>
    </Card>
  );
}
