import { Box, Stack, Typography, alpha } from '@sinnapi/ui';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import type { FieldChange } from '../../schema/presenter';

type Tone = 'before' | 'after';

function ValueChip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const color = tone === 'after' ? 'success' : 'error';
  return (
    <Box
      component="span"
      sx={{
        px: 0.75,
        py: 0.25,
        borderRadius: 1,
        maxWidth: '100%',
        fontSize: 12,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        wordBreak: 'break-word',
        color: `${color}.main`,
        bgcolor: (t) => alpha(t.palette[color].main, 0.1),
      }}
    >
      {children}
    </Box>
  );
}

/** Field-by-field before → after diff for the detail drawer. */
export default function ChangeDiffList({ changes }: { changes: FieldChange[] }) {
  if (changes.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No field-level changes were recorded for this entry.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.75}>
      {changes.map((change) => (
        <Box key={change.key}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {change.label}
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ mt: 0.5 }}
          >
            <ValueChip tone="before">{change.before}</ValueChip>
            <ArrowRightAltIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
            <ValueChip tone="after">{change.after}</ValueChip>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
