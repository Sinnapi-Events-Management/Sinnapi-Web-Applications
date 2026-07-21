import { Box, Stack, Typography, Divider } from '@sinnapi/ui';

type Props = {
  label: string;
  count: number;
};

/**
 * Sticky date separator between day sections of the feed. It sticks so the
 * admin always knows which day they are scrolling through once a section runs
 * past a screen height.
 */
export default function DayGroupHeader({ label, count }: Props) {
  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1,
        // The list scrolls under this, so it needs an opaque backdrop of its own.
        bgcolor: 'background.default',
        py: 0.75,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ lineHeight: 1.4, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}
        >
          {label}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap' }}>
          {count}
        </Typography>
        <Divider sx={{ flex: 1 }} />
      </Stack>
    </Box>
  );
}
