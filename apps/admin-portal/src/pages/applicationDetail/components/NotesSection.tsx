import { Typography, Box, alpha, SectionCard } from '@sinnapi/ui';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';

/** Internal review notes recorded on the application. */
export default function NotesSection({ notes }: { notes: string | null }) {
  if (!notes) return null;
  return (
    <SectionCard title="Review notes" icon={<StickyNote2Icon />} accent="warning">
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: (t) => alpha(t.palette.warning.main, 0.08),
          borderLeft: (t) => `3px solid ${t.palette.warning.main}`,
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {notes}
        </Typography>
      </Box>
    </SectionCard>
  );
}
