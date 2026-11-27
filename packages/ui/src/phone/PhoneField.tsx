'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Autocomplete, Box, Stack, TextField, Typography } from '@mui/material';
import {
  joinPhone,
  phoneCountries,
  phoneCountry,
  splitPhone,
  type CountryCode,
  type PhoneCountry,
} from './phone';

export type PhoneFieldProps = {
  /** The stored value: E.164 (`+256772123456`), '' or a legacy local number. */
  value: string;
  /** Always called with what should be stored — see `joinPhone`. */
  onChange: (value: string) => void;
  onBlur?: () => void;
  label?: string;
  /** Put on the number input, e.g. so a form can scroll to the first error. */
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Error message; shown under the number and turns the field red. */
  error?: string | boolean | null;
  helperText?: ReactNode;
};

/**
 * A phone number with its country: a searchable country picker (calling code)
 * beside the number.
 *
 * Every phone input in every portal is this component, so every stored number
 * is international (E.164) — the format WhatsApp needs. New numbers start on
 * Uganda (+256). An existing number saved without a country code shows with NO
 * country chosen, so the person picks it rather than us guessing.
 *
 * The country lives in local state, not in the value: the value is only what
 * would be stored, and "Kenya, nothing typed yet" stores as ''. The two are
 * re-synced whenever the value changes from outside (a form reset, a saved
 * profile loading) — detected by comparing against the last value this field
 * emitted itself.
 *
 * The picker shows the ISO code and calling code (`UG +256`) rather than a flag
 * emoji: Windows renders flag emoji as two bare letters anyway.
 */
export function PhoneField({
  value,
  onChange,
  onBlur,
  label = 'Phone number',
  id,
  name,
  required,
  disabled,
  autoFocus,
  error,
  helperText,
}: PhoneFieldProps) {
  const countries = useMemo(() => phoneCountries(), []);
  const initial = useMemo(() => splitPhone(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [country, setCountry] = useState<CountryCode | null>(initial.country);
  const [national, setNational] = useState(initial.national);
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    const next = splitPhone(value);
    setCountry(next.country);
    setNational(next.national);
    lastEmitted.current = value;
  }, [value]);

  const emit = (c: CountryCode | null, n: string) => {
    const next = joinPhone(c, n);
    lastEmitted.current = next;
    onChange(next);
  };

  const onNumber = (typed: string) => {
    // A pasted international number carries its own country: adopt it, and
    // show only the national part beside it.
    if (typed.trim().startsWith('+')) {
      const pasted = splitPhone(joinPhone(null, typed));
      if (pasted.country) {
        setCountry(pasted.country);
        setNational(pasted.national);
        emit(pasted.country, pasted.national);
        return;
      }
    }
    setNational(typed);
    emit(country, typed);
  };

  const hasError = Boolean(error);
  const message = typeof error === 'string' ? error : helperText;
  const selected = phoneCountry(country);

  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Autocomplete<PhoneCountry, false, true>
        options={countries}
        // Null (no country, a legacy number) must stay CONTROLLED: `undefined`
        // would flip MUI to uncontrolled. The cast is only for the typing,
        // which with `disableClearable` assumes a value always exists.
        value={selected as PhoneCountry}
        onChange={(_, next) => {
          setCountry(next.code);
          emit(next.code, national);
        }}
        disableClearable
        disabled={disabled}
        autoHighlight
        getOptionLabel={(c) => `${c.code} +${c.dial}`}
        isOptionEqualToValue={(a, b) => a.code === b.code}
        // Typing "uga", "256" or "UG" all find Uganda.
        filterOptions={(options, { inputValue }) => {
          const q = inputValue.trim().toLowerCase().replace(/^\+/, '');
          if (!q) return options;
          return options.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.dial.startsWith(q) ||
              c.code.toLowerCase() === q,
          );
        }}
        renderOption={(props, c) => (
          <Box component="li" {...props} key={c.code}>
            <Typography variant="body2" sx={{ flex: 1 }}>
              {c.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              +{c.dial}
            </Typography>
          </Box>
        )}
        slotProps={{ paper: { sx: { minWidth: 280 } } }}
        sx={{ width: 136, flexShrink: 0 }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Country"
            error={hasError && !country}
            inputProps={{ ...params.inputProps, 'aria-label': 'Country calling code' }}
          />
        )}
      />
      <TextField
        id={id}
        name={name}
        label={label}
        value={national}
        onChange={(e) => onNumber(e.target.value)}
        onBlur={onBlur}
        required={required}
        disabled={disabled}
        autoFocus={autoFocus}
        error={hasError}
        helperText={message}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={country === 'UG' ? '772 123456' : undefined}
        fullWidth
      />
    </Stack>
  );
}
