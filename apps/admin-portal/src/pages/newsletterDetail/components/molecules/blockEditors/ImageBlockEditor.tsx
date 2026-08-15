import { Grid, TextField } from '@sinnapi/ui';
import type { ImageBlock } from '../../../schema';
import type { BlockEditorProps } from './types';

/**
 * A full-width image.
 *
 * Alt text is marked required because `blockIssue` genuinely blocks the send
 * without it: images are off by default in Outlook and behind many corporate
 * gateways, so the alt text is what a meaningful share of recipients actually
 * read in this block's place.
 */
export default function ImageBlockEditor({
  block,
  disabled,
  onChange,
}: BlockEditorProps<ImageBlock>) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={7}>
        <TextField
          fullWidth
          size="small"
          label="Image URL"
          required
          placeholder="https://…"
          value={block.src}
          disabled={disabled}
          onChange={(e) => onChange({ src: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={5}>
        <TextField
          fullWidth
          size="small"
          label="Alt text"
          required
          value={block.alt}
          disabled={disabled}
          onChange={(e) => onChange({ alt: e.target.value })}
          helperText="Read aloud, and shown when images are blocked."
        />
      </Grid>
      <Grid item xs={12} sm={7}>
        <TextField
          fullWidth
          size="small"
          label="Link (optional)"
          placeholder="https://…"
          value={block.href ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ href: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={5}>
        <TextField
          fullWidth
          size="small"
          label="Caption (optional)"
          value={block.caption ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ caption: e.target.value })}
        />
      </Grid>
    </Grid>
  );
}
