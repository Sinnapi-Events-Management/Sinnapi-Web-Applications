import type { RichTextBlock } from '../../../schema';
import type { BlockEditorProps } from './types';
import RichTextEditor from '../RichTextEditor';

/** The WYSIWYG body. Stores TipTap's document JSON — never HTML. */
export default function RichTextBlockEditor({
  block,
  disabled,
  onChange,
}: BlockEditorProps<RichTextBlock>) {
  return (
    <RichTextEditor
      value={block.doc}
      disabled={disabled}
      onChange={(doc) => onChange({ doc })}
      placeholder="Write your message…"
    />
  );
}
