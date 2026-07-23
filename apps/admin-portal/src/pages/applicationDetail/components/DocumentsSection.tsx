import { Stack, Box, Typography, alpha } from '@sinnapi/ui';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import BadgeIcon from '@mui/icons-material/Badge';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BlockIcon from '@mui/icons-material/Block';
import SectionCard from '@/components/ui/SectionCard';

type DocEntry = {
  label: string;
  icon: React.ReactNode;
  path: string | null;
};

/** Verification documents — click to preview in-app (no new tab). */
export default function DocumentsSection({
  nationalIdPath,
  proofOfWorkPath,
  onOpen,
}: {
  nationalIdPath: string | null;
  proofOfWorkPath: string | null;
  onOpen: (path: string | null, title: string) => void;
}) {
  const docs: DocEntry[] = [
    { label: 'National ID', icon: <BadgeIcon />, path: nationalIdPath },
    { label: 'Proof of work', icon: <WorkspacePremiumIcon />, path: proofOfWorkPath },
  ];

  return (
    <SectionCard title="Documents" icon={<FolderSharedIcon />} accent="info">
      <Stack spacing={1.5}>
        {docs.map((d) => {
          const available = !!d.path;
          return (
            <Box
              key={d.label}
              role={available ? 'button' : undefined}
              tabIndex={available ? 0 : undefined}
              onClick={available ? () => onOpen(d.path, d.label) : undefined}
              onKeyDown={
                available
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpen(d.path, d.label);
                      }
                    }
                  : undefined
              }
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                border: (t) => `1px solid ${t.palette.divider}`,
                cursor: available ? 'pointer' : 'not-allowed',
                opacity: available ? 1 : 0.55,
                transition: 'all .15s',
                '&:hover': available
                  ? {
                      borderColor: 'warning.main',
                      bgcolor: (t) => alpha(t.palette.warning.main, 0.06),
                    }
                  : undefined,
                '&:focus-visible': {
                  outline: (t) => `2px solid ${t.palette.warning.main}`,
                  outlineOffset: 2,
                },
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  flexShrink: 0,
                  color: available ? 'warning.main' : 'text.disabled',
                  bgcolor: (t) =>
                    alpha(available ? t.palette.warning.main : t.palette.text.disabled, 0.12),
                }}
              >
                {d.icon}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {d.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {available ? 'Tap to preview' : 'Not provided'}
                </Typography>
              </Box>
              <Box sx={{ color: 'text.disabled', display: 'flex' }}>
                {available ? <VisibilityIcon fontSize="small" /> : <BlockIcon fontSize="small" />}
              </Box>
            </Box>
          );
        })}
      </Stack>
    </SectionCard>
  );
}
