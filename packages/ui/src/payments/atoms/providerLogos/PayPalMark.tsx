'use client';
import { useId } from 'react';
import { brand } from '../../../theme/tokens';

/**
 * The PayPal monogram — PayPal's own artwork, unmodified.
 *
 * Paths and colours are PayPal's published `paypal-mark-color.svg`
 * (https://www.paypalobjects.com/paypal-ui/logos/svg/paypal-mark-color.svg).
 * PayPal's brand rules forbid recolouring the mark, so it sits on the same
 * white tile as the others in dark mode rather than being inverted.
 *
 * `useId` keeps the clip path unique when PayPal appears twice on one screen
 * (the picker and the conversion step).
 */
export function PayPalMark({ title }: { title: string }) {
  const clipId = `pp-${useId().replace(/:/g, '')}`;

  return (
    <svg viewBox="4 1 44 49" role="img" aria-label={title} width="100%" height="100%">
      <g clipPath={`url(#${clipId})`}>
        <path
          fill={brand.paypal.navy}
          d="M38.914 13.35c0 5.574-5.144 12.15-12.927 12.15H18.49l-.368 2.322L16.373 39H7.056l5.605-36h15.095c5.083 0 9.082 2.833 10.555 6.77a9.687 9.687 0 0 1 .603 3.58z"
        />
        <path
          fill={brand.paypal.sky}
          d="M44.284 23.7A12.894 12.894 0 0 1 31.53 34.5h-5.206L24.157 48H14.89l1.483-9 1.75-11.178.367-2.322h7.497c7.773 0 12.927-6.576 12.927-12.15 3.825 1.974 6.055 5.963 5.37 10.35z"
        />
        <path
          fill={brand.paypal.blue}
          d="M38.914 13.35C37.31 12.511 35.365 12 33.248 12h-12.64L18.49 25.5h7.497c7.773 0 12.927-6.576 12.927-12.15z"
        />
      </g>
      <defs>
        <clipPath id={clipId}>
          <path d="M7.056 3h37.35v45H7.056z" />
        </clipPath>
      </defs>
    </svg>
  );
}
