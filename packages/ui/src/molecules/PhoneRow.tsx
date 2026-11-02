'use client';
import { Typography } from '@mui/material';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import { InfoRow } from './InfoRow';

export type PhoneRowProps = {
  phone: string | null | undefined;
  /**
   * Whether the other party has released their phone number. The directory
   * withholds it until an engagement is live, and a `false` here means "not
   * yet", which is different from a number the person never gave.
   */
  visible: boolean;
  /** Said in place of the number while it is withheld, e.g. "Shared once you accept the quote." */
  withheldNote: string;
  /**
   * The counterparty is still loading, or the directory returned nothing for
   * them. Either way the row shows as empty rather than as withheld, because
   * "not yet" is only true once we know who we are asking about.
   */
  unresolved?: boolean;
};

/**
 * The other side's phone number for a quote or booking.
 *
 * Phone is the only contact a portal shows. Email is never sent by the
 * directory, so there is nothing here to render or copy. Shared by both portals
 * so the rule for when the number appears is written once. The caller decides
 * what the note says, because the reason it is held back reads differently to
 * the client (waiting on their own acceptance) than to the vendor (waiting on
 * the client to commit).
 */
export function PhoneRow({ phone, visible, withheldNote, unresolved }: PhoneRowProps) {
  if (!visible && !unresolved) {
    return (
      <InfoRow
        label="Phone"
        icon={<PhoneOutlinedIcon />}
        value={
          <Typography component="span" variant="body2" color="text.secondary">
            {withheldNote}
          </Typography>
        }
      />
    );
  }

  return (
    <InfoRow
      label="Phone"
      icon={<PhoneOutlinedIcon />}
      value={unresolved ? undefined : phone}
      copyValue={phone ?? undefined}
    />
  );
}
