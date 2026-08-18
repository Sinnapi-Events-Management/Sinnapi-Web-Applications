'use client';
import type { ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';
import PercentIcon from '@mui/icons-material/Percent';
import ScheduleSendIcon from '@mui/icons-material/ScheduleSend';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SavingsIcon from '@mui/icons-material/Savings';
import LockClockIcon from '@mui/icons-material/LockClock';
import { InfoRow } from './InfoRow';
import { formatAmount, formatRate } from './money';
import { formatDay, formatTimestamp } from './datetime';

export type AdvanceTermsRowsProps = {
  /** Percentage of the agreed amount released before the event. */
  rate: number | string | null | undefined;
  daysBefore: number | null | undefined;
  note?: string | null;
  /** When the client consented. Escrow cannot be funded without this. */
  acceptedAt?: string | null;
  /** Resolved name, where the reader is allowed to see one. */
  acceptedBy?: string | null;
  /** From the escrow, once one exists — the date the advance actually leaves. */
  advanceDueAt?: string | null;
  /** The split in money, when it is known. Percentages alone under-inform. */
  advanceAmount?: number | string | null;
  balanceAmount?: number | string | null;
  currency?: string | null;
  /** How the consent row is labelled — the client reads "You accepted". */
  acceptedLabel?: string;
  /** Rendered instead of the rows when no schedule was ever set. */
  emptyMessage?: ReactNode;
};

/**
 * The advance schedule a booking was funded under, as a record.
 *
 * The consent stamp is the point of this block rather than a footnote:
 * `activate_escrow` refuses without it, so a booking that will not fund is
 * usually a booking with a missing acceptance — and the rate matters only
 * alongside who agreed to it and when.
 *
 * Zero is a real schedule, not a missing one, and it renders as its own
 * sentence: "nothing is released early" is a choice a client makes, and
 * showing it as `0%` next to a due date reads like a fault.
 */
export function AdvanceTermsRows({
  rate,
  daysBefore,
  note,
  acceptedAt,
  acceptedBy,
  advanceDueAt,
  advanceAmount,
  balanceAmount,
  currency,
  acceptedLabel = 'Client accepted',
  emptyMessage,
}: AdvanceTermsRowsProps) {
  const hasSchedule = rate !== null && rate !== undefined && rate !== '';
  if (!hasSchedule && daysBefore == null) return <>{emptyMessage ?? null}</>;

  const cur = currency ?? 'UGX';
  const releasesEarly = Number(rate) > 0;

  return (
    <Stack>
      <InfoRow
        label="Advance rate"
        icon={<PercentIcon />}
        value={hasSchedule ? formatRate(rate) : null}
      />

      {/* Only meaningful when money actually moves early. At 0% a countdown to
          a release that never happens is worse than no row at all. */}
      {releasesEarly && daysBefore != null && (
        <InfoRow
          label="Released before event"
          icon={<ScheduleSendIcon />}
          value={`${daysBefore} day${daysBefore === 1 ? '' : 's'}`}
        />
      )}

      {releasesEarly && advanceDueAt && (
        <InfoRow
          label="Advance due"
          icon={<EventAvailableIcon />}
          value={formatDay(advanceDueAt)}
        />
      )}

      {advanceAmount != null && (
        <InfoRow
          label="Advance to vendor"
          icon={<SavingsIcon />}
          value={formatAmount(advanceAmount, cur)}
        />
      )}

      {balanceAmount != null && (
        <InfoRow
          label="Held until delivery"
          icon={<LockClockIcon />}
          value={formatAmount(balanceAmount, cur)}
        />
      )}

      <InfoRow
        label={acceptedLabel}
        icon={<HowToRegIcon />}
        value={acceptedAt ? formatTimestamp(acceptedAt) : 'Not yet accepted'}
      />

      {acceptedBy && (
        <InfoRow label="Accepted by" icon={<PersonOutlineIcon />} value={acceptedBy} />
      )}

      {note && (
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', pt: 1 }}>
          &ldquo;{note}&rdquo;
        </Typography>
      )}
    </Stack>
  );
}
