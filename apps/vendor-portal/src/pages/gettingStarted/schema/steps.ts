/**
 * The onboarding wizard's steps, in order.
 *
 * Four required steps, then two optional. Only what a client needs in order to
 * find, judge and contact a vendor is required — business, offer, coverage,
 * photo. Verification and showcase sit last because they are the two steps a
 * vendor may leave: an ID is reviewed by our team on its own schedule and
 * nothing in the portal waits on it, and nothing behind showcase is blocked by
 * skipping it.
 *
 * `optional: true` is what puts a "Skip for now" in the footer, and what keeps a
 * step out of the completeness test that releases the rest of the portal.
 */
export type StepKey = 'basics' | 'story' | 'coverage' | 'photo' | 'verification' | 'showcase';

export type StepMeta = {
  key: StepKey;
  /** Short label for the desktop stepper. */
  label: string;
  /** Sentence heading above the fields. */
  title: string;
  caption: string;
  optional?: boolean;
};

export const STEPS: StepMeta[] = [
  {
    key: 'basics',
    label: 'Business',
    title: 'Tell us about your business',
    caption: 'This is what clients search and filter by.',
  },
  {
    key: 'story',
    label: 'Your offer',
    title: 'Your story and your pricing',
    caption: 'A short bio and a starting price help clients shortlist you.',
  },
  {
    key: 'coverage',
    label: 'Coverage',
    title: 'Where do you work?',
    caption: 'You will not appear in any location search until you pick at least one region.',
  },
  {
    key: 'photo',
    label: 'Photo',
    title: 'Add your profile photo',
    caption: 'Listings with a photo get noticeably more enquiries.',
  },
  {
    key: 'verification',
    label: 'Verification',
    title: 'Verify your identity',
    caption:
      'Optional — your ID stays private to our review team. A verified badge helps clients trust you.',
    optional: true,
  },
  {
    key: 'showcase',
    label: 'Showcase',
    title: 'Show your work',
    caption: 'Optional — a cover image and your socials. You can always do this later.',
    optional: true,
  },
];

/** The steps that must be done before the portal opens up. */
export const REQUIRED_STEPS = STEPS.filter((step) => !step.optional);
