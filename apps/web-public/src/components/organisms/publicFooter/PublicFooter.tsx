import NextLink from 'next/link';
import Image from 'next/image';
import { Box, Container, Grid, Typography, Link, Stack, Divider } from '@sinnapi/ui/atoms';
import { WhatsApp, EmailOutlined, PhoneOutlined, LocationOnOutlined } from '@mui/icons-material';
import { common, withAlpha } from '@sinnapi/ui/tokens';
import { CONTACT } from '@sinnapi/utils/constants';
import SocialLinks from '@/components/molecules/socialLinks';
import { FOOTER_NAV, SITE } from '@/lib/config/site';

// Strip spaces / punctuation so a display string like "+256 700 000 000"
// becomes a valid `tel:` / `wa.me` target.
const digits = (value: string) => value.replace(/[^\d]/g, '');

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

            <SocialLinks
              sx={{ mt: 3 }}
              iconSx={{
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
            />
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
