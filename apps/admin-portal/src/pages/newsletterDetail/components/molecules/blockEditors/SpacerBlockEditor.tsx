import { Box, Slider, Typography } from '@sinnapi/ui';
import type { SpacerBlock } from '../../../schema';
import type { BlockEditorProps } from './types';

/** Vertical breathing room. Bounded to the range the renderer will honour. */
export default function SpacerBlockEditor({
  block,
  disabled,
  onChange,
}: BlockEditorProps<SpacerBlock>) {
  return (
    <Box sx={{ px: 1, maxWidth: 360 }}>
      <Typography variant="caption" color="text.secondary">
        Height: {block.height}px
      </Typography>
      <Slider
        min={4}
        max={96}
        step={4}
        value={block.height}
        disabled={disabled}
        onChange={(_, value) => onChange({ height: value as number })}
        aria-label="Spacer height"
      />
    </Box>
  );
}
