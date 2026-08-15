import { useState } from 'react';
import { Autocomplete, Chip, TextField } from '@sinnapi/ui';

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Free-entry email addresses as chips.
 *
 * Splits on commas, semicolons and whitespace as well as Enter, because the way
 * addresses actually get in here is a paste from somebody's mail client — one
 * long "a@x.com; b@y.com; c@z.com" string. An input that treats that as a
 * single invalid address makes the operator hand-separate it.
 *
 * Invalid entries are refused at the point of entry rather than collected and
 * reported later: a typo is fixed in the two seconds after it is typed, and
 * never at the send confirmation.
 */
export default function EmailChipInput({ value, onChange, disabled }: Props) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const commit = (raw: string) => {
    const candidates = raw
      .split(/[;,\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (candidates.length === 0) return;

    const invalid = candidates.filter((c) => !EMAIL_RE.test(c));
    const valid = candidates.filter((c) => EMAIL_RE.test(c));

    if (valid.length) onChange(Array.from(new Set([...value, ...valid])));
    setError(invalid.length ? `Not a valid address: ${invalid.join(', ')}` : null);
    setInput(invalid.length ? invalid.join(' ') : '');
  };

  return (
    <Autocomplete
      multiple
      freeSolo
      disabled={disabled}
      options={[]}
      value={value}
      inputValue={input}
      onInputChange={(_, next, reason) => {
        if (reason === 'input') {
          // A trailing separator means the address before it is finished.
          if (/[;,]\s*$/.test(next)) commit(next);
          else setInput(next);
        }
      }}
      onChange={(_, next) => {
        // Fires on chip deletion and on Enter. Re-running the validator keeps
        // one path responsible for what is allowed to become a chip.
        const flattened = (next as string[]).flatMap((v) =>
          v
            .split(/[;,\s]+/)
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean),
        );
        onChange(Array.from(new Set(flattened.filter((v) => EMAIL_RE.test(v)))));
        setError(null);
        setInput('');
      }}
      renderTags={(tags, getTagProps) =>
        tags.map((tag, index) => (
          <Chip size="small" label={tag} {...getTagProps({ index })} key={tag} />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label="Email addresses"
          placeholder="name@example.com"
          error={Boolean(error)}
          helperText={error ?? 'Type or paste addresses. Separate with commas, spaces or Enter.'}
          onBlur={() => input && commit(input)}
        />
      )}
    />
  );
}
