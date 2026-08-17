import { Checkbox, FormControlLabel, Typography } from '@sinnapi/ui';
import { formatMoney } from '@/lib/config';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** The chosen advance, named in the consent so it is what is agreed to. */
  advanceAmount: number | null;
  currency: string | null;
};

/**
 * The recorded act of consent.
 *
 * It names the amount rather than describing the arrangement in the abstract,
 * because the amount is the part the client chose and the part they will be
 * held to — a tick against "the payment schedule" is agreement to a phrase,
 * not to a figure.
 */
export default function AdvanceConsentCheckbox({
  checked,
  onChange,
  disabled,
  advanceAmount,
  currency,
}: Props) {
  const releases = advanceAmount != null && advanceAmount > 0;

  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
      }
      label={
        <Typography variant="body2">
          {releases ? (
            <>
              I agree to this payment schedule, including {formatMoney(advanceAmount, currency)}{' '}
              being released to my vendor before the event.
            </>
          ) : (
            <>
              I agree to this payment schedule. Nothing is released to my vendor until I confirm the
              service was delivered.
            </>
          )}
        </Typography>
      }
      sx={{ alignItems: 'flex-start', m: 0, '& .MuiCheckbox-root': { pt: 0 } }}
    />
  );
}
