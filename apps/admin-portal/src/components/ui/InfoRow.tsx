import { useState } from 'react';
import { Box, Stack, Typography, IconButton, Tooltip, alpha } from '@sinnapi/ui';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

type Props = {
  label: string;
  value?: React.ReactNode;
  /** Optional leading icon for the label. */
  icon?: React.ReactNode;
  /** When set, shows a copy-to-clipboard affordance on hover. */
  copyValue?: string;
  /** Render the value in a monospace face (account numbers, refs, etc.). */
  mono?: boolean;
};

/** Aligned key/value row used across detail sections. Empty values render as “—”. */
export default function InfoRow({ label, value, icon, copyValue, mono }: Props) {
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
    <Stack
      direction="row"
      alignItems="center"
      spacing={2}
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
      <Box sx={{ flex: 1 }} />
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{
            textAlign: 'right',
            wordBreak: 'break-word',
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
