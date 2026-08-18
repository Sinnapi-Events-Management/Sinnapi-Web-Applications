import { Grid, TextField } from '@sinnapi/ui';
import type { ArticleCardBlock } from '../../../schema';
import type { BlockEditorProps } from './types';

/** A digest entry: tag, headline, excerpt, thumbnail and a read-more link. */
export default function ArticleCardBlockEditor({
  block,
  disabled,
  onChange,
}: BlockEditorProps<ArticleCardBlock>) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          size="small"
          label="Tag"
          placeholder="Vendor spotlight"
          value={block.tag ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ tag: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={8}>
        <TextField
          fullWidth
          size="small"
          label="Title"
          required
          value={block.title}
          disabled={disabled}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={2}
          label="Excerpt"
          value={block.excerpt ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ excerpt: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={7}>
        <TextField
          fullWidth
          size="small"
          label="Link"
          required
          placeholder="https://…"
          value={block.href}
          disabled={disabled}
          onChange={(e) => onChange({ href: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={5}>
        <TextField
          fullWidth
          size="small"
          label="Link label"
          placeholder="Read more"
          value={block.linkLabel ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ linkLabel: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={7}>
        <TextField
          fullWidth
          size="small"
          label="Thumbnail URL"
          placeholder="https://…"
          value={block.imageUrl ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ imageUrl: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={5}>
        <TextField
          fullWidth
          size="small"
          label="Thumbnail alt text"
          value={block.imageAlt ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ imageAlt: e.target.value })}
        />
      </Grid>
    </Grid>
  );
}
