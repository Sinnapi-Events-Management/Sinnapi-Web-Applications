import { Stack, Box, Typography, Link, alpha } from '@sinnapi/ui';
import LanguageIcon from '@mui/icons-material/Language';
import InstagramIcon from '@mui/icons-material/Instagram';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import FacebookIcon from '@mui/icons-material/Facebook';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ShareIcon from '@mui/icons-material/Share';
import SectionCard from '@/components/ui/SectionCard';
import type { IntakeDetailModel } from '@/lib/types';

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Website + social profiles as tappable rows. */
export default function LinksSection({ a }: { a: IntakeDetailModel }) {
  const links = (
    [
      { label: 'Website', url: a.website, icon: <LanguageIcon /> },
      { label: 'Instagram', url: a.instagram_url, icon: <InstagramIcon /> },
      { label: 'TikTok', url: a.tiktok_url, icon: <MusicNoteIcon /> },
      { label: 'LinkedIn', url: a.linkedin_url, icon: <LinkedInIcon /> },
      { label: 'Facebook', url: a.facebook_url, icon: <FacebookIcon /> },
    ] as { label: string; url: string | null; icon: React.ReactNode }[]
  )
    .filter((l) => !!l.url)
    .map((l) => ({ ...l, url: l.url as string }));

  if (links.length === 0) return null;

  return (
    <SectionCard title="Links" icon={<ShareIcon />} accent="secondary">
      <Stack spacing={1}>
        {links.map((l) => (
          <Link
            key={l.label}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            underline="none"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1.25,
              borderRadius: 2,
              color: 'text.primary',
              border: (t) => `1px solid ${t.palette.divider}`,
              transition: 'all .15s',
              '&:hover': {
                borderColor: 'secondary.main',
                bgcolor: (t) => alpha(t.palette.secondary.main, 0.06),
              },
            }}
          >
            <Box sx={{ color: 'secondary.main', display: 'flex' }}>{l.icon}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600}>
                {l.label}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {hostname(l.url)}
              </Typography>
            </Box>
            <OpenInNewIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
          </Link>
        ))}
      </Stack>
    </SectionCard>
  );
}
