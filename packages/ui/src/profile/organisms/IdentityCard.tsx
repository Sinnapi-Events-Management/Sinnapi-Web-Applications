'use client';
import type { ReactNode } from 'react';
import { Alert, Box, Card, CardContent, Stack } from '@mui/material';
import { ImagePicker, type ImagePickerProps } from '../molecules/ImagePicker';
import { IdentityBanner, IDENTITY_AVATAR_OVERHANG } from '../atoms/IdentityBanner';
import { IdentityHeadline } from '../atoms/IdentityHeadline';

/**
 * Where a surface's badges go.
 *
 * `below` keeps them under the name — right for badges that describe the person,
 * like an admin's roles, which read as part of the headline. `banner` lifts them
 * into the tinted band, which is right when they describe the *record's* state
 * rather than the identity, and when the facts card underneath already spells the
 * same values out as labelled rows: a second centred pill row directly above that
 * table is a duplicate the eye has to reconcile.
 */
export type IdentityBadgePlacement = 'banner' | 'below';

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
  /** Chips shown with the identity: status, roles, plan. */
  badges?: ReactNode;
  /** Where those chips sit. Defaults to `below`, the long-standing layout. */
  badgePlacement?: IdentityBadgePlacement;
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
  badgePlacement = 'below',
  children,
  onSelect,
  onRemove,
}: IdentityCardProps) {
  const inBanner = badgePlacement === 'banner';

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <IdentityBanner badges={inBanner ? badges : undefined} />

      <CardContent sx={{ pt: 0, pb: { xs: 2.5, sm: 3 }, px: { xs: 2.5, sm: 3 } }}>
        {/* The picture straddles the banner's lower edge. The banner reserves
            exactly this much room below its badges, so the two never collide. */}
        <Box sx={{ mt: -IDENTITY_AVATAR_OVERHANG }}>
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

        <IdentityHeadline name={name} subtitle={subtitle} />

        {!inBanner && badges && (
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
