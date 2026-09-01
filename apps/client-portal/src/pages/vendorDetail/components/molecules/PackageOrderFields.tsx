import type { Control } from 'react-hook-form';
import { Box, Stack, Typography } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { ControlledDateField } from '@sinnapi/ui/forms';
import { formatOfferWindow, type OfferDateWindow } from '@sinnapi/ui/offers';
import type { PackageOrderValues } from '../../schema';

type Props = {
  control: Control<PackageOrderValues>;
  eventTypeOptions: { value: string; label: string }[];
  isEventTypesLoading: boolean;
  minDate: string;
  maxDate?: string;
  /** Set when an offer is constraining the date, for the caption under it. */
  window: OfferDateWindow | null;
  /** The server's refusal of the code, which react-hook-form cannot know about. */
  codeError: string | null;
};

/**
 * The three things the package cannot tell the vendor, and the code field.
 *
 * Date first, and not by accident: on a discounted order it is the field that
 * decides whether the saving survives, so it is the one a client should meet
 * before they have invested a paragraph in the brief. Address second, because
 * "when and where" is one question and the vendor is answering both at once.
 *
 * The date is BOUNDED rather than validated. `DateField` greys out the days
 * outside the offer's window, so an ineligible date cannot be chosen at all —
 * which is a better conversation than accepting a date and then refusing the
 * order because of it. The caption says why the calendar is fenced; a fence
 * with no sign reads as a broken picker.
 */
export default function PackageOrderFields({
  control,
  eventTypeOptions,
  isEventTypesLoading,
  minDate,
  maxDate,
  window,
  codeError,
}: Props) {
  return (
    <Stack spacing={2.5}>
      {/* Side by side from `sm` up, stacked on a phone. The two together are
          one question — "when, and what for" — and separating them onto their
          own rows on a wide screen makes a short form look like a long one. */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ControlledDateField
            name="eventDate"
            control={control}
            label="Event date"
            minDate={minDate}
            maxDate={maxDate}
            fullWidth
          />
          {window && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              This offer covers events between {formatOfferWindow(window)}.
            </Typography>
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ControlledField
            name="eventTypeId"
            control={control}
            label="What kind of event?"
            options={eventTypeOptions}
            disabled={isEventTypesLoading}
            helperText={isEventTypesLoading ? 'Loading…' : 'Birthday, wedding, corporate…'}
          />
        </Box>
      </Stack>

      {/* Its own field, directly under the date, because the two together are
          what the vendor is actually agreeing to: a day and a place. It used to
          end up in the brief below — clients typed "We have a birthday at…"
          into the textarea — where nothing could read it. */}
      <ControlledField
        name="eventAddress"
        control={control}
        label="Event address"
        placeholder="Venue or street address"
        helperText="Where the vendor should turn up. This carries over to your booking."
      />

      <ControlledField
        name="details"
        control={control}
        label="Tell them about your event"
        multiline
        minRows={4}
        placeholder="Guest count, timings, anything they should know before they say yes."
        helperText="The vendor reads this before approving, so it is worth a couple of sentences."
      />

      <Box>
        <ControlledField
          name="discountCode"
          control={control}
          label="Discount code (optional)"
          placeholder="EARLY-BIRD"
          helperText="Have a code from this vendor? Add it and the saving is applied to your order."
          inputProps={{
            autoCapitalize: 'characters',
            autoCorrect: 'off',
            spellCheck: false,
            // Presentational only — the server matches case-insensitively.
            style: { textTransform: 'uppercase', letterSpacing: '0.06em' },
          }}
        />
        {/* Under the field rather than through it. `ControlledField` takes its
            error state from react-hook-form, which knows nothing about a code
            the database refused — and pushing it into the form's error state
            would mark the field permanently invalid, so a client who cleared
            the code could never submit. */}
        {codeError && (
          <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5 }}>
            {codeError} Clear the field to order without it.
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
