import { Box, Typography } from '@sinnapi/ui';

type Props = {
  triggerKey: string;
};

/**
 * Renders a dotted `domain.event` trigger key in monospace, dimming the leading
 * `domain.` segment so the event name (the part an admin scans for) stands out.
 */
export default function TriggerCell({ triggerKey }: Props) {
  const dot = triggerKey.lastIndexOf('.');
  const prefix = dot >= 0 ? triggerKey.slice(0, dot + 1) : '';
  const name = dot >= 0 ? triggerKey.slice(dot + 1) : triggerKey;

  return (
    <Box
      component="span"
      sx={{ fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
    >
      {prefix && (
        <Typography component="span" variant="inherit" color="text.disabled">
          {prefix}
        </Typography>
      )}
      <Typography component="span" variant="inherit" sx={{ fontWeight: 600 }}>
        {name}
      </Typography>
    </Box>
  );
}
