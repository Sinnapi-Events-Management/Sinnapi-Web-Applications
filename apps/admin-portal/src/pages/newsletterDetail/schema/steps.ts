/**
 * The composer's three steps.
 *
 * Ordered the way the decisions actually depend on each other: you cannot judge
 * an audience without knowing what you are sending them, and you cannot review
 * a send without both. They are navigable in any order all the same — an
 * operator returning to fix a typo should not have to walk the whole flow — but
 * the default path is the one that makes the send confirmation meaningful.
 */
export const COMPOSER_STEPS = [
  { key: 'compose', label: 'Compose', hint: 'Subject, preview text and the body.' },
  { key: 'audience', label: 'Audience', hint: 'Who receives it.' },
  { key: 'review', label: 'Review & send', hint: 'Test, schedule, send.' },
] as const;

export type ComposerStep = (typeof COMPOSER_STEPS)[number]['key'];

export function isComposerStep(value: string | null): value is ComposerStep {
  return COMPOSER_STEPS.some((s) => s.key === value);
}
