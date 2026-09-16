import { useState } from 'react';
import { Box, Button, Tooltip } from '@sinnapi/ui';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LinkIcon from '@mui/icons-material/LinkOutlined';
import CheckIcon from '@mui/icons-material/Check';

type Props = {
  publicUrl: string;
  /** Why Preview is unavailable, or null when the listing is live. */
  blockedReason: string | null;
};

/**
 * Preview and Copy link — the two things a vendor does with their public URL.
 *
 * A disabled button fires no pointer events, so the tooltip sits on a wrapping
 * span; otherwise the explanation would never appear. Copy stays available
 * either way — a link can be shared ahead of the listing going live.
 */
export default function ListingLinkActions({ publicUrl, blockedReason }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        onClick={copy}
        startIcon={copied ? <CheckIcon /> : <LinkIcon />}
        sx={{ flex: { xs: 1, sm: 'none' } }}
      >
        {copied ? 'Copied' : 'Copy link'}
      </Button>
      <Tooltip title={blockedReason ?? ''}>
        <Box component="span" sx={{ display: 'inline-flex', flex: { xs: 1, sm: 'none' } }}>
          <Button
            variant="contained"
            size="small"
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            disabled={!!blockedReason}
            endIcon={<OpenInNewIcon />}
            sx={{ flex: 1 }}
          >
            Preview listing
          </Button>
        </Box>
      </Tooltip>
    </>
  );
}
