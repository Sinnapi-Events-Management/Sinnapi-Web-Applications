import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FormControlLabel, Stack, Switch, Typography } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { CURRENCY_OPTIONS } from '../../schema';
import { useEventBudgetMode } from '../../hooks/useEventBudgetMode';

/**
 * The three columns any form editing a budget must carry. Constraining on the
 * shape rather than on one concrete form is what lets the create drawer and the
 * payment-terms dialog render the identical control over two different schemas.
 */
type BudgetFormShape = { budget_min: string; budget_max: string; currency: string };

type Props<T extends FieldValues & BudgetFormShape> = {
  control: Control<T>;
  disabled?: boolean;
  /**
   * Helper text under the main figure. The dialog explains what the number is
   * priced against; the create drawer has no comparison to point at.
   */
  helperText?: string;
};

// react-hook-form's `FieldPath<T>` cannot be told that a generic `T` has these
// keys, even though the constraint above guarantees it. One narrow cast per
// name, in one place, beats making every caller pass its own field names.
const path = <T extends FieldValues>(name: keyof BudgetFormShape) => name as FieldPath<T>;

/**
 * What the client expects to spend.
 *
 * One figure by default, because that is how a budget is normally held in
 * someone's head — "about twenty million" — and asking for two boxes invites
 * a client to invent a floor they never had. The range is one switch away for
 * the clients who genuinely think in bands, and it maps to the two columns
 * vendors and the public site already filter on.
 *
 * Purely presentational apart from the mode switch: `control` comes from the
 * owning form, so this works equally inside the create drawer's full event form
 * and the payment-terms dialog's budget-only one.
 */
export default function EventBudgetFields<T extends FieldValues & BudgetFormShape>({
  control,
  disabled,
  helperText,
}: Props<T>) {
  const mode = useEventBudgetMode(control);

  return (
    <Stack spacing={1.5}>
      {/* Column on a phone, row from `sm` up. The currency keeps a fixed width
          on the wider layout so the amount fields, which are the ones being
          typed into, take the space that is left. */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2, sm: 1.5 }}>
        {mode.isRange && (
          <ControlledField
            name={path<T>('budget_min')}
            control={control}
            label="From"
            type="number"
            disabled={disabled}
            inputProps={{ min: 0, step: 'any', inputMode: 'decimal' }}
            sx={{ flex: 1 }}
          />
        )}
        <ControlledField
          name={path<T>('budget_max')}
          control={control}
          label={mode.isRange ? 'Up to' : 'Your budget'}
          type="number"
          disabled={disabled}
          inputProps={{ min: 0, step: 'any', inputMode: 'decimal' }}
          helperText={helperText}
          sx={{ flex: 1 }}
        />
        <ControlledField
          name={path<T>('currency')}
          control={control}
          label="Currency"
          options={CURRENCY_OPTIONS}
          disabled={disabled}
          sx={{ width: { xs: '100%', sm: 116 }, flexShrink: 0 }}
        />
      </Stack>

      <FormControlLabel
        sx={{ ml: 0, gap: 1 }}
        disabled={disabled}
        control={
          <Switch
            size="small"
            checked={mode.isRange}
            onChange={(e) => mode.setRange(e.target.checked)}
            inputProps={{ 'aria-label': 'Give the budget as a range' }}
          />
        }
        label={
          <Typography variant="body2" color="text.secondary">
            {mode.isRange ? 'Budget is a range' : 'Give a range instead'}
          </Typography>
        }
      />
    </Stack>
  );
}
