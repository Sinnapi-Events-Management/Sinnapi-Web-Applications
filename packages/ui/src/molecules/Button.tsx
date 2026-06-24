'use client';
import { forwardRef, type ElementType } from 'react';
import { Button, type ButtonProps } from '@mui/material';

/**
 * Brand CTA buttons — lock in `variant="contained"` plus the brand color so call
 * sites stop repeating `variant="contained" color="primary|secondary"`.
 *
 * The white label text is NOT hard-coded here: it comes from each palette's
 * `contrastText` (see packages/ui/src/theme/tokens.ts), so primary and secondary
 * stay white-on-brand in one place. `component`/`href` remain available for
 * polymorphic use, e.g. `<PrimaryButton component={NextLink} href="/x" />`.
 */
export type BrandButtonProps = Omit<ButtonProps, 'variant' | 'color'> & {
  component?: ElementType;
  href?: string;
};

export const PrimaryButton = forwardRef<HTMLButtonElement, BrandButtonProps>(
  function PrimaryButton(props, ref) {
    return <Button ref={ref} variant="contained" color="primary" {...props} />;
  },
);

export const SecondaryButton = forwardRef<HTMLButtonElement, BrandButtonProps>(
  function SecondaryButton(props, ref) {
    return <Button ref={ref} variant="contained" color="secondary" {...props} />;
  },
);
