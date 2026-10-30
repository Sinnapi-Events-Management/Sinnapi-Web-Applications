import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, IconButton, Paper, Stack, Tooltip, Typography } from '@sinnapi/ui';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import { PeriodSelector, getPeriodOption, type AnalyticsPeriod } from '@sinnapi/ui/analytics';
import { ADD_MEDIA_LABEL, ADD_MEDIA_PATH, formatRelative } from '@/lib/config';

type Props = {
  period: AnalyticsPeriod;
  onPeriodChange: (next: AnalyticsPeriod) => void;
  /** When the payload on screen was generated, for the freshness caption. */
  generatedAt?: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  /**
   * What this toolbar reframes, for the refresh button's accessible name and
   * the loading caption — "Refresh dashboard" on one page, "Refresh analytics"
   * on the other. Screen-reader users get two distinct controls, not two
   * identically-named ones.
   */
  surfaceLabel: string;
  /** Trailing slot for controls this surface owns alone, e.g. an export menu. */
  action?: React.ReactNode;
  /**
   * Puts the upload action in the bar itself, first in the row on a phone.
   *
   * Opt-in, and off everywhere but the dashboard: Analytics is a page for
   * reading figures, its bar already carries the export menu, and a second
   * filled button beside it would make two primary actions out of one.
   */
  showAddMedia?: boolean;
};

/**
 * The reporting control bar: one period selector driving every trend beneath
 * it, a freshness read, refresh, and whatever else the surface owns.
 *
 * Sticky from `sm` up because these pages are long and the control that
 * reframes them should not scroll out of reach. Not on `xs`: a phone has too
 * little vertical room to give a permanent strip to a control used once per
 * visit, and the bar wraps to two rows there.
 *
 * With `showAddMedia`, the bar also carries the one action a vendor is most
 * likely to have come to perform. On a phone it is the *first* thing in the bar
 * — above the period label, full width, 48px tall — so it is on screen the
 * moment the dashboard paints rather than a scroll away. Because this bar is
 * not sticky on `xs`, it does scroll off; `AddMediaFab` picks the action up
 * from there, which is why the button here does not try to follow the page.
 */
export default function MetricsToolbar({
  period,
  onPeriodChange,
  generatedAt,
  isRefreshing,
  onRefresh,
  surfaceLabel,
  action,
  showAddMedia = false,
}: Props) {
  return (
    <Paper
      variant="outlined"
      sx={{
        position: { xs: 'static', sm: 'sticky' },
        top: { sm: 8 },
        zIndex: 3,
        borderRadius: 3,
        px: { xs: 2, sm: 2.5 },
        py: { xs: 1.75, sm: 1.5 },
        mb: 3,
        // The page scrolls beneath this bar, so it needs an opaque backdrop —
        // `background.paper` reads as a raised strip against the page's
        // `background.default` canvas in both schemes.
        bgcolor: 'background.paper',
        backdropFilter: 'saturate(180%) blur(6px)',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        spacing={{ xs: 1.5, sm: 2 }}
      >
        {/* Takes the slack from `sm` up, so the CTA and the controls group to
            the right instead of the button floating in the middle of the bar. */}
        <Box sx={{ minWidth: 0, flexGrow: { sm: 1 } }}>
          <Typography variant="subtitle2" noWrap>
            {getPeriodOption(period).longLabel}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {generatedAt
              ? `Updated ${formatRelative(generatedAt)}`
              : `Loading your ${surfaceLabel.toLowerCase()}…`}
          </Typography>
        </Box>

        {/* photos and videos cta */}
        {showAddMedia && (
          <Button
            component={RouterLink}
            to={ADD_MEDIA_PATH}
            variant="contained"
            startIcon={<AddPhotoAlternateOutlinedIcon />}
            sx={{
              // Above the period label on a phone, beside the controls on a
              // desktop — read first where the screen is a single column, and
              // grouped with the other actions where there is room for a row.
              order: { xs: -1, sm: 0 },
              flexShrink: 0,
              // Material's 48px minimum, not the 44px floor: these vendors are
              // uploading one-handed from a phone, often outdoors.
              minHeight: 48,
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            {ADD_MEDIA_LABEL}
          </Button>
        )}

        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            flexShrink: 0,
            // The period toggle is the widest control here; letting it scroll
            // keeps every option reachable on a narrow phone without wrapping
            // the row into a third line.
            overflowX: 'auto',
            // A scroll container clips a focus ring flush to its edge.
            py: 0.25,
          }}
        >
          <PeriodSelector value={period} onChange={onPeriodChange} />

          <Tooltip title={`Refresh ${surfaceLabel.toLowerCase()}`}>
            {/* span keeps the tooltip working while the button is disabled */}
            <span>
              <IconButton
                onClick={onRefresh}
                disabled={isRefreshing}
                aria-label={`Refresh ${surfaceLabel.toLowerCase()}`}
              >
                <RefreshIcon
                  sx={{
                    animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': { to: { transform: 'rotate(360deg)' } },
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>

          {action}
        </Stack>
      </Stack>
    </Paper>
  );
}
