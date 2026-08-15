import { Grid, TextField } from '@sinnapi/ui';
import type { ButtonBlock } from '../../../schema';
import type { BlockEditorProps } from './types';

/** A single, prominent call to action. */
export default function ButtonBlockEditor({
  block,
  disabled,
  onChange,
}: BlockEditorProps<ButtonBlock>) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={5}>
        <TextField
          fullWidth
          size="small"
          label="Button label"
          required
          placeholder="Browse vendors"
          value={block.label}
          disabled={disabled}
          onChange={(e) => onChange({ label: e.target.value })}
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
    </Grid>
  );
}
