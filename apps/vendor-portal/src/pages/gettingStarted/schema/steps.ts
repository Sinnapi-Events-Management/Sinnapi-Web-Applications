/**
 * The onboarding wizard's steps, in order.
 *
 * Five required steps, then one optional. Setup flows longer than about five
 * steps lose a large share of users between start and finish, so verification
 * and payout share one step — they are the same errand to a vendor ("prove who
 * you are and tell us where the money goes"), and that is how the old public
 * application grouped them too. Showcase sits last precisely because it is the
 * one step a vendor may leave: nothing behind it is blocked by skipping it.
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
    title: 'Verification and payout',
    caption: 'Your ID stays private to our review team, and your bank details are encrypted.',
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
