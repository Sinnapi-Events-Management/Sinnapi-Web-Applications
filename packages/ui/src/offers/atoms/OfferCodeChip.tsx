'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

export type OfferCodeChipProps = {
  /** Null for a signed-out reader — the RPCs redact it. */
  code?: string | null;
  /** True when the offer needs no code at all. */
  isAutomatic?: boolean | null;
  size?: 'small' | 'medium';
};

/**
 * The code, in the state the reader is actually in.
 *
 * Three states, and they are not interchangeable:
 *
 *   automatic   There is no code. Saying "applied automatically" is the whole
 *               message — a client who goes looking for a code they were never
 *               going to get is a client who does not book.
 *   redacted    A code exists and this reader is signed out. The server sends
 *               null; this says why, which is the difference between an
 *               incomplete card and an invitation to sign in.
 *   visible     The code, and one tap to copy it.
 *
 * DELIBERATELY NOT WIRED TO `useToast`
 * The kit is imported by the Next.js marketing site as well as the three SPAs,
 * and a toast needs a provider mounted above it. A component that renders
 * correctly in three apps and throws in the fourth is not shared. The tick on
 * the button is the confirmation instead — local, sufficient, and it works
 * everywhere.
 *
 * The clipboard write can refuse (an insecure context, a denied permission),
 * and a silent failure is the worst outcome: a client who believes they hold
 * the code will paste whatever was there before. A refusal falls back to
 * selecting the text so it can be copied by hand.
 */
export function OfferCodeChip({ code, isAutomatic, size = 'small' }: OfferCodeChipProps) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const codeRef = useRef<HTMLSpanElement | null>(null);
  const timer = useRef<number | undefined>(undefined);

  // Cleared on unmount: a card scrolled out of a virtualised list while its
  // tick is showing would otherwise set state on a gone component.
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setFailed(false);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true);
      // Select it so the reader can copy it the manual way rather than being
      // told it did not work and left with nothing to do about that.
      const node = codeRef.current;
      if (node && typeof window.getSelection === 'function') {
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }, [code]);

  const height = size === 'small' ? 26 : 32;

  if (isAutomatic) {
    return (
      <Shell height={height} tone="auto">
        <AutoAwesomeRoundedIcon sx={{ fontSize: size === 'small' ? 15 : 17 }} />
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          Applied automatically
        </Typography>
      </Shell>
    );
  }

  if (!code) {
    return (
      <Tooltip title="Sign in to see this code">
        <Shell height={height} tone="locked">
          <LockOutlinedIcon sx={{ fontSize: size === 'small' ? 15 : 17 }} />
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.08em' }}>
            •••••••
          </Typography>
        </Shell>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={failed ? 'Select the code and copy it manually' : 'Copy code'}>
      <Shell
        height={height}
        tone="code"
        onClick={copy}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            void copy();
          }
        }}
      >
        <Typography
          component="span"
          ref={codeRef}
          variant="caption"
          sx={{
            fontWeight: 800,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            letterSpacing: '0.06em',
          }}
        >
          {code}
        </Typography>
        {copied ? (
          <CheckRoundedIcon sx={{ fontSize: size === 'small' ? 15 : 17 }} />
        ) : (
          <ContentCopyRoundedIcon sx={{ fontSize: size === 'small' ? 14 : 16, opacity: 0.7 }} />
        )}
      </Shell>
    </Tooltip>
  );
}

/**
 * The dashed ticket outline all three states share.
 *
 * Dashed rather than solid because that is the visual language of a coupon,
 * and because it tells the three states apart from the solid chips (`saving`,
 * `deadline`, `scope`) sitting beside them in the same row.
 */
function Shell({
  children,
  height,
  tone,
  ...rest
}: {
  children: React.ReactNode;
  height: number;
  tone: 'code' | 'locked' | 'auto';
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Box
      {...rest}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        height,
        px: 1.25,
        borderRadius: 1.5,
        border: '1px dashed',
        maxWidth: '100%',
        overflow: 'hidden',
        cursor: tone === 'code' ? 'pointer' : 'default',
        // Focus has to be visible: this is a real button for keyboard users
        // and MUI's Chip ring is not inherited by a plain Box.
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
        ...(tone === 'auto'
          ? {
              color: 'success.main',
              borderColor: (t) => alpha(t.palette.success.main, 0.5),
              bgcolor: (t) =>
                alpha(t.palette.success.main, t.palette.mode === 'dark' ? 0.16 : 0.09),
            }
          : tone === 'locked'
            ? {
                color: 'text.disabled',
                borderColor: 'divider',
              }
            : {
                color: 'primary.main',
                borderColor: (t) => alpha(t.palette.primary.main, 0.5),
                bgcolor: (t) =>
                  alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.08),
                '&:hover': {
                  bgcolor: (t) =>
                    alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.24 : 0.14),
                },
              }),
      }}
    >
      {children}
    </Box>
  );
}
