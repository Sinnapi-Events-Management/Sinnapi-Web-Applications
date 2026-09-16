import type { FieldKey } from '../data/schema';

/** DOM id of a field's input, so a failed submit can move focus to it. */
export const fieldId = (key: FieldKey) => `vendor-application-${key}`;
