import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Avatar, Box, Link, Stack, Typography } from '@sinnapi/ui';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import { initials } from '@/lib/config';
import type { BookingPartyModel } from '@/lib/types';

type Props = {
  /** "Vendor" or "Client" — the role, not the person's name. */
  role: string;
  party: BookingPartyModel;
  icon: ReactNode;
  /** Where their own console page lives, when they have one. */
  to?: string;
};

/**
 * One side of a booking: who they are and the two ways to reach them.
 *
 * Contact details are rendered as `mailto:`/`tel:` links rather than plain
 * text. Support's next move after opening a booking is almost always to
 * contact one of these two people, and making them retype an address is the
 * kind of small friction that gets worked around by copying from the database.
 */
export default function PartyRow({ role, party, icon, to }: Props) {
  const name = party.name ?? '—';

  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Avatar sx={{ width: 40, height: 40, fontSize: 14 }}>{initials(name)}</Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: 'text.secondary' }}>
          <Box sx={{ display: 'flex', '& svg': { fontSize: 15 } }}>{icon}</Box>
          <Typography variant="caption">{role}</Typography>
        </Stack>
        <Typography variant="subtitle2" fontWeight={700} noWrap>
          {to ? (
            <Link component={RouterLink} to={to} underline="hover" color="inherit">
              {name}
            </Link>
          ) : (
            name
          )}
        </Typography>

        <Stack spacing={0.25} sx={{ mt: 0.5 }}>
          {party.email && (
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
              <EmailIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
              <Link href={`mailto:${party.email}`} variant="caption" underline="hover" noWrap>
                {party.email}
              </Link>
            </Stack>
          )}
          {party.phone && (
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
              <PhoneIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
              <Link href={`tel:${party.phone}`} variant="caption" underline="hover" noWrap>
                {party.phone}
              </Link>
            </Stack>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
