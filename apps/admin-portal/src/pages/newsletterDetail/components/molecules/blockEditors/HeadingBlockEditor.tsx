import { TextField } from '@sinnapi/ui';
import type { HeadingBlock } from '../../../schema';
import type { BlockEditorProps } from './types';

/** A section break inside a long body. */
export default function HeadingBlockEditor({
  block,
  disabled,
  onChange,
}: BlockEditorProps<HeadingBlock>) {
  return (
    <TextField
      fullWidth
      size="small"
      label="Heading"
      value={block.text}
      disabled={disabled}
      onChange={(e) => onChange({ text: e.target.value })}
    />
  );
}
