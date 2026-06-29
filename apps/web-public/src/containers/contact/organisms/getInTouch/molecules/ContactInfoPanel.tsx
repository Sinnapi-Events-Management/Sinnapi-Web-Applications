import { Box, Stack, Typography, Link, Divider } from '@sinnapi/ui';
import { AccessTime } from '@sinnapi/ui/icons';
import { palette, withAlpha } from '@sinnapi/ui/tokens';
import SocialLinks from '@/components/molecules/socialLinks';
import { CONTACT_DETAILS, BUSINESS_HOURS } from '../data/contactDetails';

/**
 * The reassurance column beside the form: direct-contact rows, opening hours,
 * and social links. Data-driven from the shared CONTACT constants so it never
 * drifts from the footer.
 */
export default function ContactInfoPanel() {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary">
          Reach us directly
        </Typography>
        <Typography variant="h4" sx={{ mt: 0.5 }}>
          Talk to a real person
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5 }}>
          Prefer to call or email? Use any of the channels below — we typically reply within one
          business day.
        </Typography>
      </Box>

      <Stack spacing={2}>
        {CONTACT_DETAILS.map(({ Icon, label, value, href, external }) => (
          <Stack key={label} direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                flexShrink: 0,
                width: 44,
                height: 44,
                borderRadius: 2,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'primary.main',
                bgcolor: withAlpha(palette.light.primary.main, 0.1),
              }}
            >
              <Icon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {label}
              </Typography>
              <Link
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                underline="hover"
                color="text.primary"
                sx={{ fontWeight: 600 }}
              >
                {value}
              </Link>
            </Box>
          </Stack>
        ))}
      </Stack>

      <Divider />

      <Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'primary.main' }}>
          <AccessTime fontSize="small" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Office hours
          </Typography>
        </Stack>
        <Stack spacing={0.5} sx={{ mt: 1.5 }}>
          {BUSINESS_HOURS.map(({ days, hours }) => (
            <Stack key={days} direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                {days}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {hours}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Follow us
        </Typography>
        <SocialLinks size="medium" iconFontSize="medium" spacing={0.5} />
      </Box>
    </Stack>
  );
}
