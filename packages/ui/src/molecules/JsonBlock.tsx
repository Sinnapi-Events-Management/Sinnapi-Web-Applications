'use client';
import { useMemo, useState } from 'react';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

export type JsonBlockProps = {
  /** Any JSON-serialisable value. `null`/`undefined` render as an empty note. */
  value: unknown;
  /** Shown above the block, e.g. the payload's name. */
  label?: string;
  /** Height cap before the block scrolls, in px. */
  maxHeight?: number;
  /** Text for the empty case. */
  emptyMessage?: string;
};

/**
 * A raw JSON payload, pretty-printed and copyable.
 *
 * For the admin surfaces that show what a provider actually sent — a PSP
 * webhook body, an audit record's before/after, a template's variables. The
 * block is monospace, wraps long tokens rather than forcing the page to
 * scroll sideways, and caps its own height so one large payload cannot push
 * the rest of a section off screen. Copy takes the exact serialised text, so
 * what is pasted into a provider's support ticket is what we stored.
 *
 * Theme-aware through the palette rather than a fixed colour, so the block
 * reads as a code surface in both modes without a fork per portal.
 */
export function JsonBlock({
  value,
  label,
  maxHeight = 360,
  emptyMessage = 'No payload recorded.',
}: JsonBlockProps) {
  const [copied, setCopied] = useState(false);
  const text = useMemo(() => {
    if (value === null || value === undefined) return null;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);

  async function copy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  if (!text) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyMessage}
      </Typography>
    );
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      {(label || text) && (
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="overline" color="text.secondary">
            {label}
          </Typography>
          <Tooltip title={copied ? 'Copied' : 'Copy JSON'}>
            <IconButton size="small" onClick={copy} aria-label={`Copy ${label ?? 'JSON'}`}>
              {copied ? (
                <CheckIcon sx={{ fontSize: 15, color: 'success.main' }} />
              ) : (
                <ContentCopyIcon sx={{ fontSize: 15 }} />
              )}
            </IconButton>
          </Tooltip>
        </Stack>
      )}
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          maxHeight,
          overflow: 'auto',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 12.5,
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: (t) =>
            t.palette.mode === 'dark'
              ? alpha(t.palette.common.black, 0.3)
              : alpha(t.palette.common.black, 0.035),
        }}
      >
        {text}
      </Box>
    </Box>
  );
}
