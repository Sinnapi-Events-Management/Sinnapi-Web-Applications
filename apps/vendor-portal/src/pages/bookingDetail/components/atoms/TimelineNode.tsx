import { Box, Stack } from '@sinnapi/ui';

type Props = {
  /** Reached steps are filled; projected ones stay hollow. */
  done: boolean;
  /** The last node has nothing below it to connect to. */
  isLast: boolean;
};

/**
 * The dot-and-rail gutter of one timeline row. The rail is drawn by the node
 * above it rather than between rows, which keeps the row itself a plain flex
 * item and lets rows of different heights line up without measurement.
 */
export default function TimelineNode({ done, isLast }: Props) {
  return (
    <Stack alignItems="center" sx={{ alignSelf: 'stretch', width: 20, flexShrink: 0 }}>
      <Box
        sx={{
          width: 11,
          height: 11,
          mt: 0.6,
          borderRadius: '50%',
          border: '2px solid',
          borderColor: done ? 'secondary.main' : 'divider',
          bgcolor: done ? 'secondary.main' : 'transparent',
        }}
      />
      {!isLast && <Box sx={{ flex: 1, width: '2px', my: 0.5, bgcolor: 'divider' }} />}
    </Stack>
  );
}
