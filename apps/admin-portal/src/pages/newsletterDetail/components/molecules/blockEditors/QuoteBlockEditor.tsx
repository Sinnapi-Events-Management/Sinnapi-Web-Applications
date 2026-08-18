import { Grid, TextField } from '@sinnapi/ui';
import type { QuoteBlock } from '../../../schema';
import type { BlockEditorProps } from './types';

/** A testimonial or pull quote. */
export default function QuoteBlockEditor({
  block,
  disabled,
  onChange,
}: BlockEditorProps<QuoteBlock>) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={8}>
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={2}
          label="Quote"
          required
          value={block.text}
          disabled={disabled}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          size="small"
          label="Attribution"
          placeholder="Aisha, bride, Kampala"
          value={block.attribution ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ attribution: e.target.value })}
        />
      </Grid>
    </Grid>
  );
}
