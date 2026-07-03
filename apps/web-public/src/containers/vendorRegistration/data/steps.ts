// Stepper metadata for the 4-step vendor application. Order is authoritative:
// step index ↔ validation schema ↔ rendered fields.
export type StepMeta = { label: string; caption: string };

export const STEPS: StepMeta[] = [
  { label: 'Business & owner', caption: 'Tell us who you are' },
  { label: 'Services & portfolio', caption: 'What you offer & your work' },
  { label: 'Verification & payout', caption: 'Trust and getting paid' },
  { label: 'References & terms', caption: 'Finish and submit' },
];
