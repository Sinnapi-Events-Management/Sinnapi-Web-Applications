import { TextField } from '@sinnapi/ui';

type Props = {
  value: string;
  onChange: (value: string) => void;
  limit: number;
  disabled?: boolean;
};

/**
 * A line to your vendors about how you want to pay.
 *
 * Optional, and worth having: a vendor reading "off platform" with no
 * explanation is a vendor who declines rather than asks.
 *
 * The counter only appears once the note is close to the limit. Shown always,
 * it would be noise on a field most clients write two lines into; shown never,
 * a client typing a long explanation would meet the cap as a surprise.
 */
export default function EventTermsNoteField({ value, onChange, limit, disabled }: Props) {
  const remaining = limit - value.length;
  const nearLimit = remaining <= 80;

  return (
    <TextField
      label="Note for your vendors (optional)"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      multiline
      minRows={2}
      fullWidth
      disabled={disabled}
      inputProps={{ maxLength: limit }}
      helperText={
        nearLimit
          ? `${remaining} characters left.`
          : 'Shown to every vendor you book under this event.'
      }
    />
  );
}
