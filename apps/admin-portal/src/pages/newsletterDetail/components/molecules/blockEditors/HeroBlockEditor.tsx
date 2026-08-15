import { Grid, TextField } from '@sinnapi/ui';
import type { HeroBlock } from '../../../schema';
import type { BlockEditorProps } from './types';

/**
 * The opening block: eyebrow, headline, standfirst, image and one CTA.
 *
 * The CTA label and link sit side by side because they are meaningless apart —
 * `blockIssue` rejects a block that has one without the other, and putting them
 * on the same row is the layout saying so before the validation has to.
 */
export default function HeroBlockEditor({
  block,
  disabled,
  onChange,
}: BlockEditorProps<HeroBlock>) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          size="small"
          label="Eyebrow"
          placeholder="This month"
          value={block.eyebrow ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ eyebrow: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={8}>
        <TextField
          fullWidth
          size="small"
          label="Headline"
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
          label="Standfirst"
          value={block.subtitle ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ subtitle: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={7}>
        <TextField
          fullWidth
          size="small"
          label="Image URL"
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
          label="Image alt text"
          value={block.imageAlt ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ imageAlt: e.target.value })}
          helperText="Shown when images are blocked."
        />
      </Grid>
      <Grid item xs={12} sm={5}>
        <TextField
          fullWidth
          size="small"
          label="Button label"
          value={block.ctaLabel ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ ctaLabel: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={7}>
        <TextField
          fullWidth
          size="small"
          label="Button link"
          placeholder="https://…"
          value={block.ctaHref ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ ctaHref: e.target.value })}
        />
      </Grid>
    </Grid>
  );
}
