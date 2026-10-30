'use client';
import { Typography } from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import { InfoRow } from './InfoRow';

export type ContactRowsProps = {
  email: string | null | undefined;
  phone: string | null | undefined;
  /**
   * Whether the other party has released their contact details. The directory
   * withholds them until an engagement is live, and a `false` here means "not
   * yet", which is different from a field the person never filled in.
   */
  visible: boolean;
  /** Said in place of the rows while they are withheld, e.g. "Shared once you accept the quote." */
  withheldNote: string;
  /**
   * The counterparty is still loading, or the directory returned nothing for
   * them. Either way the rows show as empty rather than as withheld, because
   * "not yet" is only true once we know who we are asking about.
   */
  unresolved?: boolean;
};

/**
 * Email and phone for the other side of a quote or booking.
 *
 * Shared by both portals so the rule for when contact details appear is written
 * once. The caller decides what the note says, because the reason a detail is
 * held back reads differently to the client (waiting on their own acceptance)
 * than to the vendor (waiting on the client to commit).
 */
export function ContactRows({ email, phone, visible, withheldNote, unresolved }: ContactRowsProps) {
  if (!visible && !unresolved) {
    return (
      <InfoRow
        label="Contact"
        icon={<MailOutlineIcon />}
        value={
          <Typography component="span" variant="body2" color="text.secondary">
            {withheldNote}
          </Typography>
        }
      />
    );
  }

  return (
    <>
      <InfoRow
        label="Email"
        icon={<MailOutlineIcon />}
        value={unresolved ? undefined : email}
        copyValue={email ?? undefined}
      />
      <InfoRow
        label="Phone"
        icon={<PhoneOutlinedIcon />}
        value={unresolved ? undefined : phone}
        copyValue={phone ?? undefined}
      />
    </>
  );
}
