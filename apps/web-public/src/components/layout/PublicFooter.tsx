import NextLink from 'next/link';
import Image from 'next/image';
import { SvgIcon, type SvgIconProps } from '@mui/material';
import { Box, Container, Grid, Typography, Link, Stack, Divider, IconButton } from '@sinnapi/ui';
import {
  Instagram,
  Facebook,
  Twitter,
  LinkedIn,
  WhatsApp,
  EmailOutlined,
  PhoneOutlined,
  LocationOnOutlined,
} from '@sinnapi/ui/icons';
import { common, withAlpha } from '@sinnapi/ui/tokens';
import { CONTACT } from '@sinnapi/utils/constants';
import { FOOTER_NAV, SITE } from '@/lib/config/site';

// MUI ships no TikTok brand glyph, so we provide the logo path inline. It
// inherits SvgIcon sizing/color, so it behaves like every other social icon.
function TikTok(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.6-2.59c.27 0 .52.04.77.11V9.78a5.7 5.7 0 0 0-.77-.05 5.69 5.69 0 1 0 5.69 5.69V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.29 4.29 0 0 1-3.24-1.48Z" />
    </SvgIcon>
  );
}

// Strip spaces / punctuation so a display string like "+256 700 000 000"
// becomes a valid `tel:` / `wa.me` target.
const digits = (value: string) => value.replace(/[^\d]/g, '');

// Social profiles, mapped from the shared CONTACT data to their icons.
const SOCIALS = [
  { label: 'Instagram', href: CONTACT.social.instagram, Icon: Instagram },
  { label: 'Facebook', href: CONTACT.social.facebook, Icon: Facebook },
  { label: 'X', href: CONTACT.social.x, Icon: Twitter },
  { label: 'LinkedIn', href: CONTACT.social.linkedin, Icon: LinkedIn },
  { label: 'TikTok', href: CONTACT.social.tiktok, Icon: TikTok },
];

// Contact rows, derived from the shared CONTACT data.
const CONTACT_ITEMS = [
  { label: CONTACT.email, href: `mailto:${CONTACT.email}`, Icon: EmailOutlined, external: false },
  {
    label: CONTACT.phone,
    href: `tel:+${digits(CONTACT.phone)}`,
    Icon: PhoneOutlined,
    external: false,
  },
  {
    label: CONTACT.whatsapp,
    href: `https://wa.me/${digits(CONTACT.whatsapp)}`,
    Icon: WhatsApp,
    external: true,
  },
  { label: CONTACT.address, href: undefined, Icon: LocationOnOutlined, external: false },
];

export default function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'primary.dark',
        color: 'common.white',
        borderTop: '3px solid',
        borderColor: 'secondary.main',
        pt: { xs: 6, md: 8 },
        pb: 4,
        // In dark mode: near-black page surface, and the gold accent line becomes
        // teal to match the dark CTA. Selector set on <html> by ColorModeProvider.
        '[data-mui-color-scheme="dark"] &': {
          bgcolor: 'background.default',
          borderColor: 'primary.main',
        },
      }}
    >
      <Container>
        <Grid container spacing={{ xs: 5, md: 4 }}>
          {/* Brand + mission + socials */}
          <Grid item xs={12} md={4}>
            <Box
              component={NextLink}
              href="/"
              aria-label={SITE.name}
              sx={{ display: 'inline-flex' }}
            >
              <Image
                src="/logo-light.png"
                alt={SITE.name}
                width={626}
                height={399}
                style={{ height: 40, width: 'auto' }}
              />
            </Box>
            <Typography
              variant="body2"
              sx={{ mt: 2.5, color: withAlpha(common.white, 0.7), maxWidth: 320, lineHeight: 1.7 }}
            >
              {SITE.description}
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
              {SOCIALS.map(({ label, href, Icon }) => (
                <IconButton
                  key={label}
                  component="a"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  size="small"
                  sx={{
                    color: withAlpha(common.white, 0.85),
                    border: `1px solid ${withAlpha(common.white, 0.18)}`,
                    transition: 'all .2s ease',
                    '&:hover': {
                      color: 'primary.dark',
                      bgcolor: 'secondary.main',
                      borderColor: 'secondary.main',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Icon fontSize="small" />
                </IconButton>
              ))}
            </Stack>
          </Grid>

          {/* Link columns */}
          {Object.entries(FOOTER_NAV).map(([group, links]) => (
            <Grid item xs={6} md={2} key={group}>
              <Typography
                variant="overline"
                sx={{ color: withAlpha(common.white, 0.5), letterSpacing: '1px' }}
              >
                {group}
              </Typography>
              <Stack spacing={1.25} sx={{ mt: 2 }}>
                {links.map((l) => (
                  <Link
                    key={l.href}
                    component={NextLink}
                    href={l.href}
                    underline="none"
                    sx={{
                      color: withAlpha(common.white, 0.72),
                      fontSize: '0.9rem',
                      width: 'fit-content',
                      transition: 'color .2s ease',
                      '&:hover': { color: 'secondary.light' },
                    }}
                  >
                    {l.label}
                  </Link>
                ))}
              </Stack>
            </Grid>
          ))}

          {/* Contact column */}
          <Grid item xs={6} md={2}>
            <Typography
              variant="overline"
              sx={{ color: withAlpha(common.white, 0.5), letterSpacing: '1px' }}
            >
              Contact
            </Typography>
            <Stack spacing={1.75} sx={{ mt: 2 }}>
              {CONTACT_ITEMS.map(({ label, href, Icon, external }) => {
                const content = (
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Icon sx={{ color: 'secondary.light', fontSize: 18 }} />
                    <Typography variant="body2" sx={{ color: withAlpha(common.white, 0.72) }}>
                      {label}
                    </Typography>
                  </Stack>
                );
                return href ? (
                  <Link
                    key={label}
                    href={href}
                    underline="none"
                    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    sx={{
                      width: 'fit-content',
                      transition: 'opacity .2s ease',
                      '&:hover': { opacity: 0.75 },
                    }}
                  >
                    {content}
                  </Link>
                ) : (
                  <Box key={label}>{content}</Box>
                );
              })}
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4, borderColor: withAlpha(common.white, 0.12) }} />

        {/* Bottom bar */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Typography variant="caption" sx={{ color: withAlpha(common.white, 0.55) }}>
            © {year} {SITE.name}. Empowering everyone to plan their events seamlessly, wherever they
            are.
          </Typography>
          <Stack direction="row" spacing={2.5}>
            <Link
              component={NextLink}
              href="/terms"
              underline="none"
              sx={{
                color: withAlpha(common.white, 0.55),
                fontSize: '0.8rem',
                '&:hover': { color: 'common.white' },
              }}
            >
              Terms
            </Link>
            <Link
              component={NextLink}
              href="/vendor-terms"
              underline="none"
              sx={{
                color: withAlpha(common.white, 0.55),
                fontSize: '0.8rem',
                '&:hover': { color: 'common.white' },
              }}
            >
              Vendor Terms
            </Link>
            <Link
              component={NextLink}
              href="/client-event-planner-terms"
              underline="none"
              sx={{
                color: withAlpha(common.white, 0.55),
                fontSize: '0.8rem',
                '&:hover': { color: 'common.white' },
              }}
            >
              Client Terms
            </Link>
            <Link
              component={NextLink}
              href="/privacy"
              underline="none"
              sx={{
                color: withAlpha(common.white, 0.55),
                fontSize: '0.8rem',
                '&:hover': { color: 'common.white' },
              }}
            >
              Privacy
            </Link>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
