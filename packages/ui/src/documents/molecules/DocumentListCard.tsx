'use client';
import type { ReactNode } from 'react';
import { RecordCard } from '../../molecules/RecordCard';

export type DocumentListCardProps = {
  title: string;
  amount: string;
  meta: ReactNode;
  chip: ReactNode;
  /** Optional line under the card, e.g. what is still owed. */
  footer?: ReactNode;
  onClick: () => void;
};

/**
 * One invoice or receipt on a phone, where a seven-column table would mean
 * scrolling sideways to find the amount. The generic `RecordCard`, kept under
 * its own name so the documents kit's API does not change.
 */
export function DocumentListCard(props: DocumentListCardProps) {
  return <RecordCard {...props} />;
}
