'use client';
import { Chip } from '@mui/material';
import { statusColor, titleizeStatus } from './statusColor';

export type StatusChipProps = {
  /** Raw enum value from the database, e.g. `release_requested`. */
  status: string;
  size?: 'small' | 'medium';
};

/**
 * Chip rendering a domain status with its canonical colour and label. Colourless
 * statuses render outlined so the chip row does not become a wall of grey fills.
 */
export function StatusChip({ status, size = 'small' }: StatusChipProps) {
  const color = statusColor(status);
  return (
    <Chip
      size={size}
      color={color}
      label={titleizeStatus(status)}
      variant={color === 'default' ? 'outlined' : 'filled'}
    />
  );
}
