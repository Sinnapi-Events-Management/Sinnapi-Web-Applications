import { SvgIcon, type SvgIconProps } from '@mui/material';
import { Stack, IconButton } from '@sinnapi/ui/atoms';
import { type Theme } from '@sinnapi/ui/theme';
import { type SxProps } from '@sinnapi/ui/system';
import { Instagram, Facebook, YouTube, LinkedIn } from '@mui/icons-material';
import { CONTACT } from '@sinnapi/utils/constants';

// MUI ships no TikTok brand glyph, so we provide the logo path inline. It
// inherits SvgIcon sizing/color, so it behaves like every other social icon.
function TikTok(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.6-2.59c.27 0 .52.04.77.11V9.78a5.7 5.7 0 0 0-.77-.05 5.69 5.69 0 1 0 5.69 5.69V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.29 4.29 0 0 1-3.24-1.48Z" />
    </SvgIcon>
  );
}

// Social profiles, mapped from the shared CONTACT data to their icons. Single
// source of truth — consumed by both the footer and the navbar top bar.
const SOCIALS = [
  { label: 'Instagram', href: CONTACT.social.instagram, Icon: Instagram },
  { label: 'Facebook', href: CONTACT.social.facebook, Icon: Facebook },
  { label: 'YouTube', href: CONTACT.social.youtube, Icon: YouTube },
  { label: 'LinkedIn', href: CONTACT.social.linkedin, Icon: LinkedIn },
  { label: 'TikTok', href: CONTACT.social.tiktok, Icon: TikTok },
];

type SocialLinksProps = {
  /** Gap between icons (MUI spacing units). */
  spacing?: number;
  /** IconButton hit-area size. */
  size?: 'small' | 'medium';
  /** Glyph size. */
  iconFontSize?: 'inherit' | 'small' | 'medium' | 'large';
  /** Per-button styling — lets each surface (footer / navbar) theme the icons. */
  iconSx?: SxProps<Theme>;
  /** Styling for the wrapping Stack. */
  sx?: SxProps<Theme>;
};

/**
 * Presentational row of external social-profile links. Purely data-driven from
 * the shared CONTACT constants; callers control appearance via `iconSx`/`sx`.
 */
export default function SocialLinks({
  spacing = 1,
  size = 'small',
  iconFontSize = 'small',
  iconSx,
  sx,
}: SocialLinksProps) {
  return (
    <Stack direction="row" spacing={spacing} sx={sx}>
      {SOCIALS.map(({ label, href, Icon }) => (
        <IconButton
          key={label}
          component="a"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          size={size}
          sx={iconSx}
        >
          <Icon fontSize={iconFontSize} />
        </IconButton>
      ))}
    </Stack>
  );
}
