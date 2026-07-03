import { Stack, Link, Typography } from '@sinnapi/ui/atoms';
import { EmailOutlined, PhoneOutlined } from '@mui/icons-material';
import { common, withAlpha } from '@sinnapi/ui/tokens';
import { CONTACT } from '@sinnapi/utils/constants';

// Strip spaces / punctuation so a display string like "+256 700 000 000"
// becomes a valid `tel:` target.
const digits = (value: string) => value.replace(/[^\d]/g, '');

const CONTACT_LINKS = [
  { label: CONTACT.phone, href: `tel:+${digits(CONTACT.phone)}`, Icon: PhoneOutlined },
  { label: CONTACT.email, href: `mailto:${CONTACT.email}`, Icon: EmailOutlined },
];

/**
 * Compact phone + email quick-links for the navbar top bar. Colour adapts to the
 * transparent (over-hero) vs solid navbar surface.
 */
export default function NavContactLinks({ transparent = false }: { transparent?: boolean }) {
  const color = transparent ? withAlpha(common.white, 0.85) : 'text.secondary';

  return (
    <Stack direction="row" spacing={2.5} alignItems="center">
      {CONTACT_LINKS.map(({ label, href, Icon }) => (
        <Link
          key={label}
          href={href}
          underline="none"
          sx={{
            color,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            transition: 'color .2s ease',
            '&:hover': { color: transparent ? 'common.white' : 'primary.main' },
          }}
        >
          <Icon sx={{ fontSize: 16 }} />
          <Typography variant="caption" sx={{ fontWeight: 500 }}>
            {label}
          </Typography>
        </Link>
      ))}
    </Stack>
  );
}
