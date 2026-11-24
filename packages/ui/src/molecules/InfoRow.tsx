'use client';
import { useState, type ReactNode } from 'react';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

export type InfoRowProps = {
  label: string;
  value?: ReactNode;
  /** Optional leading icon for the label. */
  icon?: ReactNode;
  /** When set, shows a copy-to-clipboard affordance on hover. */
  copyValue?: string;
  /** Render the value in a monospace face (account numbers, refs, etc.). */
  mono?: boolean;
};

/** Aligned key/value row used across detail sections. Empty values render as “—”. */
export function InfoRow({ label, value, icon, copyValue, mono }: InfoRowProps) {
  const [copied, setCopied] = useState(false);
  const display = value === undefined || value === null || value === '' ? '—' : value;

  async function copy() {
    if (!copyValue) return;
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  return (
    // Wraps rather than squeezes: the label never shrinks, so in a narrow card
    // a long label ("Two-step verification") used to crush the value into one
    // letter per line. Now a value that cannot fit beside its label drops to its
    // own line, still right-aligned; rows that fit render exactly as before.
    <Stack
      direction="row"
      alignItems="center"
      flexWrap="wrap"
      useFlexGap
      columnGap={2}
      rowGap={0.25}
      sx={{
        py: 1,
        borderBottom: (t) => `1px dashed ${alpha(t.palette.divider, 0.9)}`,
        '&:last-of-type': { borderBottom: 0 },
        '&:hover .info-row-copy': { opacity: 1 },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0, flexShrink: 0 }}>
        {icon && (
          <Box sx={{ color: 'text.disabled', display: 'flex', '& svg': { fontSize: 18 } }}>
            {icon}
          </Box>
        )}
        <Typography variant="body2" color="text.secondary" noWrap>
          {label}
        </Typography>
      </Stack>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="flex-end"
        spacing={0.5}
        sx={{ minWidth: 0, maxWidth: '100%', ml: 'auto' }}
      >
        <Typography
          variant="subtitle2"
          fontWeight={600}
          sx={{
            textAlign: 'right',
            minWidth: 0,
            overflowWrap: 'anywhere',
            fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : undefined,
          }}
        >
          {display}
        </Typography>
        {copyValue && (
          <Tooltip title={copied ? 'Copied' : 'Copy'}>
            <IconButton
              size="small"
              onClick={copy}
              className="info-row-copy"
              sx={{ opacity: { xs: 1, md: 0 }, transition: 'opacity .15s' }}
              aria-label={`Copy ${label}`}
            >
              {copied ? (
                <CheckIcon sx={{ fontSize: 15, color: 'success.main' }} />
              ) : (
                <ContentCopyIcon sx={{ fontSize: 15 }} />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Stack>
  );
}
