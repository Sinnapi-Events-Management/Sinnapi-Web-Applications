// Inquiry categories shown in the contact form's "How can we help?" select.
// Kept as a typed tuple so the zod schema can derive its enum from the same
// source — add a value here and validation picks it up automatically.
export const INQUIRY_TYPES = [
  'General enquiry',
  'Booking support',
  'Become a vendor',
  'Partnerships',
  'Press & media',
] as const;

export type InquiryType = (typeof INQUIRY_TYPES)[number];
