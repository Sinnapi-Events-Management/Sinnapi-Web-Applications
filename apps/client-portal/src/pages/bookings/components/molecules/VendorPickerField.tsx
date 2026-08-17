import { useState } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { Autocomplete, Avatar, CircularProgress, Stack, TextField, Typography } from '@sinnapi/ui';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useVendorLookup, VENDOR_LOOKUP_LIMIT } from '@/hooks/queries';
import type { VendorOptionModel } from '@/lib/types';
import type { NewBookingValues } from '../../schema';

type Props = {
  control: Control<NewBookingValues>;
  disabled?: boolean;
};

/**
 * Which vendor this booking is for.
 *
 * The whole point of starting a booking from this page is that the client
 * already has someone in mind, so the field opens on the full catalogue in
 * alphabetical order and narrows as they type. Both halves matter: a client who
 * knows the name types it, and one who half-remembers it scrolls — a picker
 * that demanded a search term before showing anything served only the first of
 * them.
 *
 * The ordering and the filtering are both the server's, which is what makes the
 * alphabet trustworthy: sorting a truncated page in the browser would order
 * whichever rows arrived rather than the catalogue. Typing is debounced, so a
 * name is one request rather than one per keystroke.
 *
 * The field keeps the selected vendor object locally so the chosen name
 * survives a search that has since moved on; the form only ever holds the id.
 */
export default function VendorPickerField({ control, disabled }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<VendorOptionModel | null>(null);

  const debounced = useDebouncedValue(query, 300);
  const { data, isFetching, error } = useVendorLookup(debounced);

  const options = data?.vendors ?? [];
  const isTruncated = data?.isTruncated ?? false;

  return (
    <Controller
      name="vendor_id"
      control={control}
      render={({ field, fieldState }) => (
        <Autocomplete
          options={options}
          value={selected}
          loading={isFetching}
          disabled={disabled}
          getOptionLabel={(v) => v.business_name}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          // The catalogue is filtered and ordered on the server; filtering the
          // rows it sent again in the browser would drop matches it chose to
          // include and re-order what it deliberately alphabetised.
          filterOptions={(x) => x}
          onInputChange={(_, value, reason) => {
            if (reason === 'input') setQuery(value);
            // Clearing the field puts the whole list back rather than leaving
            // it narrowed by a term that is no longer on screen.
            if (reason === 'clear') setQuery('');
          }}
          onChange={(_, vendor) => {
            setSelected(vendor);
            field.onChange(vendor?.id ?? '');
          }}
          noOptionsText={isFetching ? 'Loading vendors…' : 'No vendors match that name'}
          renderOption={(props, vendor) => (
            <li {...props} key={vendor.id}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                <Avatar
                  src={vendor.profile_image_url ?? vendor.primary_image_url ?? undefined}
                  sx={{ width: 32, height: 32 }}
                >
                  {vendor.business_name.charAt(0)}
                </Avatar>
                <Stack sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {vendor.business_name}
                  </Typography>
                  {vendor.base_city && (
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {vendor.base_city}
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Vendor"
              required
              onBlur={field.onBlur}
              inputRef={field.ref}
              error={!!fieldState.error || !!error}
              helperText={helperText({
                fieldError: fieldState.error?.message,
                hasLoadError: !!error,
                isTruncated,
              })}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {isFetching && <CircularProgress size={16} color="inherit" />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      )}
    />
  );
}

/**
 * One line under the field, in priority order: the form's own complaint first,
 * then a failure to load at all, then the fact that the list is capped.
 *
 * The truncation notice is not decoration. The list is ordered alphabetically
 * and cut at a fixed size, so a vendor whose name starts with W is genuinely
 * absent from an unfiltered dropdown — telling the client to type is the
 * difference between a picker that looks broken and one that is merely paged.
 */
function helperText(input: {
  fieldError?: string;
  hasLoadError: boolean;
  isTruncated: boolean;
}): string {
  if (input.fieldError) return input.fieldError;
  if (input.hasLoadError) return 'We could not load the vendor list. Check your connection.';
  if (input.isTruncated) {
    return `Showing the first ${VENDOR_LOOKUP_LIMIT} vendors alphabetically — type to find others.`;
  }
  return 'Pick from the list, or type to search by name.';
}
