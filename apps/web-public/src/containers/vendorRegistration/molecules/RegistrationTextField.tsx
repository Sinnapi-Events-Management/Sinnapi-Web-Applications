import { FormField, type FormFieldProps } from '@sinnapi/ui/molecules';
import type { TextFieldKey } from '../data/schema';
import type { RegistrationFields } from '../hooks/useRegistrationFields';
import { fieldId } from '../utils/fieldId';

type Props = Omit<FormFieldProps, 'id' | 'name' | 'value' | 'onChange' | 'error'> & {
  name: TextFieldKey;
  fields: RegistrationFields;
};

/** A text input bound to one string field of the application: value, change and error. */
export default function RegistrationTextField({ name, fields, ...rest }: Props) {
  return (
    <FormField
      id={fieldId(name)}
      name={name}
      fullWidth
      value={fields.values[name]}
      onChange={(e) => fields.set(name, e.target.value)}
      error={fields.errors[name]}
      {...rest}
    />
  );
}
