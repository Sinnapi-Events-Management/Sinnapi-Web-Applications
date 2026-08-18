import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Box } from '@sinnapi/ui';
import RichTextToolbar from './RichTextToolbar';

type Props = {
  value: JSONContent;
  onChange: (doc: JSONContent) => void;
  disabled?: boolean;
  placeholder?: string;
};

/**
 * The WYSIWYG body editor.
 *
 * ── It emits JSON, not HTML ───────────────────────────────────────────────
 * `onChange` hands up `editor.getJSON()` — TipTap's ProseMirror document — and
 * that is what is stored and what the Edge Function renders. Storing HTML would
 * put an operator-authored string on the path to every customer's inbox, which
 * needs a sanitiser, and every sanitiser bug is then a stored XSS in mail we
 * send ourselves. It would also not survive the trip: the semantic HTML an
 * editor emits is not the table-based markup Outlook's Word engine needs, so it
 * would have to be rewritten anyway. See `_shared/newsletterBlocks.ts`.
 *
 * ── The extension set is bounded by the renderer ───────────────────────────
 * `codeBlock` and `horizontalRule` are off: the first has no place in a
 * newsletter, and the second is a block type of its own in the composer, so
 * offering it inline too would give the same rule two homes. Headings are
 * capped at levels 2–3 because level 1 is the campaign's own hero.
 *
 * ── One-way binding ───────────────────────────────────────────────────────
 * `content` seeds the editor once and is never pushed back in on re-render.
 * Feeding the parent's copy back would move the caret to the end of the
 * document on every keystroke — the single most common bug in a controlled
 * rich-text integration.
 */
export default function RichTextEditor({ value, onChange, disabled, placeholder }: Props) {
  const editor = useEditor(
    {
      editable: !disabled,
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
          codeBlock: false,
          horizontalRule: false,
        }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          // The renderer re-checks every href through `escapeUrl` anyway; this
          // is the editor refusing to create one it knows will be neutered.
          protocols: ['http', 'https', 'mailto', 'tel'],
        }),
        // Supplies the `is-editor-empty` class the prompt below is styled from.
        Placeholder.configure({ placeholder: placeholder ?? 'Write your message…' }),
      ],
      content: value,
      onUpdate: ({ editor: e }) => onChange(e.getJSON()),
    },
    // Only the editable flag is a genuine input; `value` is deliberately absent
    // for the reason in the doc comment above.
    [disabled],
  );

  if (!editor) return null;

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
      <RichTextToolbar editor={editor} disabled={disabled} />
      <Box
        sx={{
          px: 2,
          py: 1.5,
          minHeight: 160,
          cursor: disabled ? 'default' : 'text',
          '& .ProseMirror': {
            outline: 'none',
            minHeight: 130,
            fontSize: 15,
            lineHeight: 1.7,
            '& p': { my: 1 },
            '& h2': { fontSize: 19, fontWeight: 600, mt: 2, mb: 1 },
            '& h3': { fontSize: 17, fontWeight: 600, mt: 2, mb: 1 },
            '& a': { color: 'primary.main', textDecoration: 'underline' },
            '& blockquote': {
              borderLeft: 3,
              borderColor: 'divider',
              pl: 2,
              ml: 0,
              color: 'text.secondary',
            },
            // The editor is empty far more often than it is full — an operator
            // opens a text block and stares at a blank box — so the prompt is
            // rendered from the Placeholder extension's data attribute.
            '& p.is-editor-empty:first-of-type::before': {
              content: 'attr(data-placeholder)',
              color: 'text.disabled',
              float: 'left',
              height: 0,
              pointerEvents: 'none',
            },
          },
        }}
        onClick={() => !disabled && editor.chain().focus().run()}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
}
