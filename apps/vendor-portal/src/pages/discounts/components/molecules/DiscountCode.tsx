import { Box, IconButton, Stack, Tooltip, Typography } from '@sinnapi/ui';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';

type Props = {
  /** The code string, or null for a discount that applies without one. */
  code: string | null;
  /** True while this exact code is the one just copied. */
  copied: boolean;
  onCopy: (code: string) => void;
};

/**
 * The code itself — the one thing on the card that leaves the screen.
 *
 * Set in monospace on a tinted band, so a code is unmistakably a *token* to be
 * transcribed rather than a title to be read. Monospace is not decoration here:
 * `RUBY-0O1` is only unambiguous in a face that distinguishes zero from O, and
 * the vendor reading it out to a client is the person who pays for a face that
 * does not.
 *
 * Copying is the primary interaction on this screen and gets a real button
 * rather than a click-anywhere surface, because the card's own click target is
 * a menu and a code silently copied by a mis-click is worse than no copy at
 * all. The button holds a tick for two seconds after a copy — the toast says
 * what happened, this says *which one* it happened to, which is the part a
 * toast in the corner of a twelve-card grid cannot.
 *
 * A discount with no code is a real thing — an automatic reduction that needs
 * nothing typed — so it says so plainly and offers nothing to copy, rather than
 * rendering an empty band that reads as a code that failed to load.
 */
export default function DiscountCode({ code, copied, onCopy }: Props) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{
        px: 1.5,
        py: 1,
        borderRadius: 2,
        // Tinted from the theme's own action layer rather than a fixed grey, so
        // the band sits correctly on both the light paper and the warm dark
        // canvas without a second palette.
        bgcolor: 'action.hover',
        border: 1,
        borderColor: 'divider',
        minWidth: 0,
      }}
    >
      {code ? (
        <>
          <Typography
            sx={{
              flex: 1,
              minWidth: 0,
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '0.06em',
              // Long codes truncate rather than wrap: the band is a fixed
              // landmark at the top of every card, and one code that wraps
              // shifts every line beneath it out of step with its neighbours.
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={code}
          >
            {code}
          </Typography>
          <Tooltip title={copied ? 'Copied' : 'Copy code'}>
            <IconButton
              size="small"
              aria-label={`Copy code ${code}`}
              onClick={() => onCopy(code)}
              sx={{ flexShrink: 0 }}
            >
              {copied ? (
                <CheckIcon fontSize="small" color="success" />
              ) : (
                <ContentCopyIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </>
      ) : (
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
          <BoltOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Automatic
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Applies with no code
            </Typography>
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
