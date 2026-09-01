import { Box } from '@mui/material';

type Props = {
  value: string;
  /** Larger treatment for the result heading; the default suits inline use. */
  size?: 'sm' | 'lg';
};

/**
 * An identifier, rendered so it can be read off the screen and typed somewhere
 * else without a mistake.
 *
 * Three things do that work. A monospace face, so `SB` and `S8` are different
 * widths rather than different guesses. Positive letter-spacing, because a
 * proportional gap is what stops a ten-character run reading as one word. And
 * `wordBreak: 'break-all'`, so a narrow phone wraps the string instead of
 * pushing the card sideways — an id is the one piece of text on the page with
 * no spaces to wrap at.
 *
 * The colour comes from `text.primary` rather than a fixed hex, so the same
 * component is legible on the light theme's paper and the dark theme's warm
 * canvas without either being told about the other.
 */
export default function PublicIdText({ value, size = 'sm' }: Props) {
  return (
    <Box
      component="span"
      sx={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: size === 'lg' ? { xs: '1.25rem', sm: '1.5rem' } : '0.875rem',
        fontWeight: size === 'lg' ? 600 : 500,
        letterSpacing: size === 'lg' ? '0.06em' : '0.04em',
        color: 'text.primary',
        wordBreak: 'break-all',
      }}
    >
      {value}
    </Box>
  );
}
