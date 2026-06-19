'use client';
import { forwardRef, type ReactNode } from 'react';
import {
  Card as MuiCard,
  type CardProps,
  CardHeader,
  CardContent,
  CardActions,
} from '@mui/material';

// Standard surfaces re-exported directly (drop-in, polymorphism preserved).
export {
  Card,
  type CardProps,
  CardHeader,
  CardContent,
  CardActions,
  CardMedia,
  CardActionArea,
} from '@mui/material';

export type InfoCardProps = CardProps & {
  /** Optional header title rendered via CardHeader. */
  title?: ReactNode;
  subheader?: ReactNode;
  /** Optional action node placed in the header (e.g. an IconButton). */
  headerAction?: ReactNode;
  /** Footer actions rendered in CardActions. */
  actions?: ReactNode;
  /** Disable the default CardContent wrapper around children. */
  disableContentPadding?: boolean;
};

/**
 * Convenience composed card: header + content + actions in one component.
 * Use plain `Card` for full control.
 */
export const InfoCard = forwardRef<HTMLDivElement, InfoCardProps>(function InfoCard(
  { title, subheader, headerAction, actions, disableContentPadding, children, ...rest },
  ref,
) {
  return (
    <MuiCard ref={ref} variant={rest.variant ?? 'outlined'} {...rest}>
      {(title || subheader || headerAction) && (
        <CardHeader title={title} subheader={subheader} action={headerAction} />
      )}
      {disableContentPadding ? children : <CardContent>{children}</CardContent>}
      {actions && <CardActions>{actions}</CardActions>}
    </MuiCard>
  );
});
