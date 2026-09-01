import { Alert, Box, Button, DialogActions, DialogContent, Stack } from '@sinnapi/ui';
import PackageOrderFields from '../molecules/PackageOrderFields';
import PackageOrderSummary from '../molecules/PackageOrderSummary';
import { usePackageOrderForm } from '../../hooks/usePackageOrderForm';
import type { PackageRequest } from '../../hooks/useVendorPackages';

type Props = {
  request: PackageRequest;
  onCancel: () => void;
  onSuccess: () => void;
};

/**
 * Placing an order for a published tier.
 *
 * Two halves, and the order of them is the argument: what you are paying, then
 * what they need to know. The old flow put a brief first because the price did
 * not exist yet; here it does, and burying it under a textarea would mean the
 * client scrolls past the total to reach the button that commits to it.
 *
 * On a wide screen the summary sits beside the fields rather than above them,
 * so the figure stays visible while the brief is being written. Below `md`
 * there is no column to put it in, so it goes on top — still before the fields,
 * still before the button.
 *
 * Layout only. `usePackageOrderForm` owns the pricing, the date bounds, the
 * RPC and where the two kinds of refusal land.
 */
export default function PackageOrderForm({ request, onCancel, onSuccess }: Props) {
  const {
    control,
    error,
    codeError,
    busy,
    submit,
    pricing,
    offer,
    tierName,
    packageName,
    eventTypeOptions,
    isEventTypesLoading,
    minDate,
    maxDate,
    window,
  } = usePackageOrderForm(request, onSuccess);

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* `row-reverse` rather than `row` plus CSS `order`, and the difference
            is not cosmetic — the first version had no gap between the two
            columns at all.

            MUI's `Stack` implements `spacing` as a margin on
            `& > :not(style) ~ :not(style)`, on the side it derives from
            `direction`. With `direction="row"` that is `margin-left`, applied to
            the second DOM child. Swapping the visual columns with `order` left
            that margin attached to whichever box was now on the LEFT — so the
            gap was pushed to the outside edge of the row and the two columns sat
            flush against each other.

            `row-reverse` is a direction Stack knows about: it puts the margin on
            the right instead. The summary can stay authored first (so on a phone
            it reads before the fields, in DOM order rather than only visually)
            and still sit on the right on a desktop. */}
        <Stack
          direction={{ xs: 'column', md: 'row-reverse' }}
          spacing={{ xs: 2.5, md: 3 }}
          alignItems="flex-start"
          sx={{ mt: 1 }}
        >
          <Box sx={{ width: { xs: '100%', md: 340 }, flexShrink: 0 }}>
            <PackageOrderSummary
              packageName={packageName}
              tierName={tierName}
              offer={offer}
              pricing={pricing}
            />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            <PackageOrderFields
              control={control}
              eventTypeOptions={eventTypeOptions}
              isEventTypesLoading={isEventTypesLoading}
              minDate={minDate}
              maxDate={maxDate}
              window={window}
              codeError={codeError}
            />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        {/* Names the consequence, not the mechanism. "Send request" was honest
            when a vendor was going to price it; this button commits the client
            to a figure, and the label has to say so. */}
        <Button type="submit" variant="contained" disabled={busy}>
          {busy ? 'Placing order…' : 'Place order'}
        </Button>
      </DialogActions>
    </Box>
  );
}
