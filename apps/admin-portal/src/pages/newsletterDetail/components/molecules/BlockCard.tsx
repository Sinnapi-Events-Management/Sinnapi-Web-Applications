import { Box, Card, CardContent, Chip, IconButton, Stack, Tooltip, Typography } from '@sinnapi/ui';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { BLOCK_META, blockIssue, type CampaignBlock } from '../../schema';

type Props = {
  block: CampaignBlock;
  index: number;
  total: number;
  disabled?: boolean;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  children: React.ReactNode;
};

/**
 * The chrome around one block: its type, its reorder/duplicate/delete controls,
 * and any reason it is not yet sendable.
 *
 * The issue is surfaced here, on the block, rather than only in the review
 * step's list. A campaign with eleven blocks and one missing alt attribute is
 * otherwise a scavenger hunt — the review step tells you something is wrong,
 * and this tells you where.
 */
export default function BlockCard({
  block,
  index,
  total,
  disabled,
  onMove,
  onDuplicate,
  onRemove,
  children,
}: Props) {
  const issue = blockIssue(block);
  const meta = BLOCK_META[block.type];

  return (
    <Card
      variant="outlined"
      sx={{ borderColor: issue ? 'warning.light' : 'divider', overflow: 'visible' }}
    >
      <CardContent sx={{ pb: 2 }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1.5 }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Chip size="small" label={meta.label} />
            <Typography variant="caption" color="text.secondary" noWrap>
              {meta.hint}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.25}>
            <Tooltip title="Move up">
              <span>
                <IconButton
                  size="small"
                  disabled={disabled || index === 0}
                  onClick={() => onMove(-1)}
                  aria-label="Move block up"
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Move down">
              <span>
                <IconButton
                  size="small"
                  disabled={disabled || index === total - 1}
                  onClick={() => onMove(1)}
                  aria-label="Move block down"
                >
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Duplicate">
              <span>
                <IconButton
                  size="small"
                  disabled={disabled}
                  onClick={onDuplicate}
                  aria-label="Duplicate block"
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Remove">
              <span>
                <IconButton
                  size="small"
                  color="error"
                  disabled={disabled}
                  onClick={onRemove}
                  aria-label="Remove block"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        {children}

        {issue && (
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <WarningAmberIcon fontSize="small" color="warning" />
            <Typography variant="caption" color="warning.main">
              {issue}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
