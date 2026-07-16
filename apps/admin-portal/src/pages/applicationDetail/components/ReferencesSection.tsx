import { Grid, Box, Stack, Typography, Avatar, alpha } from '@sinnapi/ui';
import ContactsIcon from '@mui/icons-material/Contacts';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import EventIcon from '@mui/icons-material/Event';
import CelebrationIcon from '@mui/icons-material/Celebration';
import SectionCard from '@/components/ui/SectionCard';
import { formatDate } from '@/lib/config';
import type { IntakeReferee } from '@/lib/types';

function initials(name?: string): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Referee cards — one per reference with contact + event context. */
export default function ReferencesSection({ referees }: { referees: IntakeReferee[] }) {
  if (referees.length === 0) return null;
  return (
    <SectionCard
      title="References"
      icon={<ContactsIcon />}
      accent="info"
      subtitle={`${referees.length} provided`}
    >
      <Grid container spacing={2}>
        {referees.map((r, i) => {
          const lines = [
            r.email && { icon: <EmailIcon />, text: r.email },
            r.phone && { icon: <PhoneIcon />, text: r.phone },
            r.eventWorkedOn && { icon: <CelebrationIcon />, text: r.eventWorkedOn },
            r.eventDate && { icon: <EventIcon />, text: formatDate(r.eventDate) },
          ].filter(Boolean) as { icon: React.ReactNode; text: string }[];
          return (
            <Grid item xs={12} sm={6} key={i}>
              <Box
                sx={{
                  height: '100%',
                  p: 2,
                  borderRadius: 2,
                  border: (t) => `1px solid ${t.palette.divider}`,
                  bgcolor: (t) => alpha(t.palette.info.main, 0.04),
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                  <Avatar sx={{ bgcolor: 'info.main', width: 36, height: 36, fontSize: 15 }}>
                    {initials(r.fullName)}
                  </Avatar>
                  <Typography fontWeight={700} noWrap>
                    {r.fullName || 'Unnamed referee'}
                  </Typography>
                </Stack>
                <Stack spacing={0.75}>
                  {lines.map((l, j) => (
                    <Stack key={j} direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{ color: 'text.disabled', display: 'flex', '& svg': { fontSize: 16 } }}
                      >
                        {l.icon}
                      </Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ wordBreak: 'break-word' }}
                      >
                        {l.text}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </SectionCard>
  );
}
