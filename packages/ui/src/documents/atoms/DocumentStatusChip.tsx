'use client';
import { Chip } from '@mui/material';
import {
  INVOICE_STATUS_META,
  RECEIPT_STATUS_META,
  type InvoiceDisplayStatus,
} from '../documentStatus';
import type { ReceiptStatus } from '../types';

type Props =
  | { kind: 'invoice'; status: InvoiceDisplayStatus; size?: 'small' | 'medium' }
  | { kind: 'receipt'; status: ReceiptStatus; size?: 'small' | 'medium' };

/**
 * An invoice or receipt status in the app (lists, detail heroes). Themed, so
 * it follows light and dark mode — unlike the stamp on the paper itself.
 * Its own chip rather than `StatusChip` because "Partly paid" and "Received"
 * are not what `titleizeStatus` would make of the enum values.
 */
export function DocumentStatusChip(props: Props) {
  const meta =
    props.kind === 'invoice'
      ? INVOICE_STATUS_META[props.status]
      : RECEIPT_STATUS_META[props.status];
  const outlined = meta.color === 'default';
  return (
    <Chip
      size={props.size ?? 'small'}
      color={meta.color}
      variant={outlined ? 'outlined' : 'filled'}
      label={meta.label}
      sx={{ fontWeight: 600 }}
    />
  );
}
