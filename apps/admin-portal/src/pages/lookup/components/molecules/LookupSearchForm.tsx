import { Box, FormHelperText } from '@mui/material';
import { Button, SearchField } from '@sinnapi/ui';

type Props = {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  canSubmit: boolean;
  isLoading: boolean;
  helperText: string | null;
};

/**
 * The field an agent pastes an identifier into.
 *
 * Presentational: every decision about what is valid, what has been submitted
 * and when to fire lives in `usePublicIdLookup`. This owns the form element and
 * nothing else.
 *
 * A real `<form>` rather than a Box with a click handler, because Enter is how
 * anyone actually submits a single-field search and getting that free is the
 * whole reason the element exists.
 *
 * LAYOUT: the field and the button stack on a phone and sit side by side from
 * `sm` up. The button takes `alignSelf: stretch` when stacked so it matches the
 * field's width, and a fixed floor when inline so "Look up" and "Looking…" do
 * not resize the row mid-request.
 */
export default function LookupSearchForm({
  value,
  onChange,
  onSubmit,
  onClear,
  canSubmit,
  isLoading,
  helperText,
}: Props) {
  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1.5,
          alignItems: { xs: 'stretch', sm: 'flex-start' },
        }}
      >
        <SearchField
          value={value}
          onChange={onChange}
          onClear={onClear}
          ariaLabel="Sinnapi ID"
          placeholder="SV285K7BV9"
          error={!!helperText}
          autoFocus
          // `characters` keeps a phone keyboard in caps for a field whose
          // content is always uppercase, and turns off the correction and
          // capitalisation guessing that would otherwise mangle an id.
          inputProps={{
            autoCapitalize: 'characters',
            autoCorrect: 'off',
            spellCheck: false,
            maxLength: 24,
          }}
          sx={{ flex: 1, minWidth: 0 }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={!canSubmit || isLoading}
          sx={{ minWidth: { sm: 120 }, alignSelf: { xs: 'stretch', sm: 'auto' } }}
        >
          {isLoading ? 'Looking…' : 'Look up'}
        </Button>
      </Box>
      {helperText && <FormHelperText error>{helperText}</FormHelperText>}
    </Box>
  );
}
