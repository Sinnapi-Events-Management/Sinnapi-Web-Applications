import { Divider, Stack, ToggleButton, Tooltip } from '@sinnapi/ui';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import TitleIcon from '@mui/icons-material/Title';
import type { Editor } from '@tiptap/react';

type Props = { editor: Editor; disabled?: boolean };

/**
 * The formatting controls, built from portal atoms so the editor reads as part
 * of the console rather than as an embedded third-party widget.
 *
 * Deliberately short. Every control here maps to something
 * `_shared/newsletterBlocks.ts` can render into Outlook-safe markup — there is
 * no font picker, no colour picker and no alignment, because a WYSIWYG that
 * offers formatting the email renderer will silently drop is worse than one
 * that never offered it.
 */
export default function RichTextToolbar({ editor, disabled }: Props) {
  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', previous ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const button = (
    key: string,
    title: string,
    active: boolean,
    onClick: () => void,
    icon: React.ReactNode,
  ) => (
    <Tooltip key={key} title={title}>
      {/* A disabled button inside a Tooltip needs a focusable wrapper for the
          tooltip to fire, which `span` supplies without affecting layout. */}
      <span>
        <ToggleButton
          value={key}
          size="small"
          selected={active}
          disabled={disabled}
          onClick={onClick}
          aria-label={title}
          sx={{ border: 0, px: 1 }}
        >
          {icon}
        </ToggleButton>
      </span>
    </Tooltip>
  );

  return (
    <Stack
      direction="row"
      spacing={0.25}
      alignItems="center"
      flexWrap="wrap"
      sx={{ px: 1, py: 0.5, borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}
    >
      {button(
        'bold',
        'Bold',
        editor.isActive('bold'),
        () => editor.chain().focus().toggleBold().run(),
        <FormatBoldIcon fontSize="small" />,
      )}
      {button(
        'italic',
        'Italic',
        editor.isActive('italic'),
        () => editor.chain().focus().toggleItalic().run(),
        <FormatItalicIcon fontSize="small" />,
      )}
      {button(
        'strike',
        'Strikethrough',
        editor.isActive('strike'),
        () => editor.chain().focus().toggleStrike().run(),
        <StrikethroughSIcon fontSize="small" />,
      )}

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.75 }} />

      {button(
        'h2',
        'Subheading',
        editor.isActive('heading', { level: 2 }),
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        <TitleIcon fontSize="small" />,
      )}
      {button(
        'bullet',
        'Bullet list',
        editor.isActive('bulletList'),
        () => editor.chain().focus().toggleBulletList().run(),
        <FormatListBulletedIcon fontSize="small" />,
      )}
      {button(
        'ordered',
        'Numbered list',
        editor.isActive('orderedList'),
        () => editor.chain().focus().toggleOrderedList().run(),
        <FormatListNumberedIcon fontSize="small" />,
      )}
      {button(
        'quote',
        'Quote',
        editor.isActive('blockquote'),
        () => editor.chain().focus().toggleBlockquote().run(),
        <FormatQuoteIcon fontSize="small" />,
      )}

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.75 }} />

      {button('link', 'Add link', editor.isActive('link'), setLink, <LinkIcon fontSize="small" />)}
      {button(
        'unlink',
        'Remove link',
        false,
        () => editor.chain().focus().unsetLink().run(),
        <LinkOffIcon fontSize="small" />,
      )}
    </Stack>
  );
}
