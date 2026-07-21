import { useState } from 'react';
import {
  Box,
  Stack,
  Paper,
  Typography,
  Chip,
  Button,
  IconButton,
  Collapse,
  Divider,
  Tooltip,
} from '@sinnapi/ui';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import IconBadge from '@/components/ui/IconBadge';
import type { CategoryView } from '../../hooks/useRolePermissions';
import CategoryIcon from '../molecules/CategoryIcon';
import GrantMeter from '../molecules/GrantMeter';
import PermissionRow from '../molecules/PermissionRow';

type Props = {
  category: CategoryView;
  granted: ReadonlySet<string>;
  locked: boolean;
  pending: ReadonlySet<string>;
  bulkBusy: boolean;
  /** Forces the body open — set while a search is active. */
  forceExpanded: boolean;
  onToggle: (permissionId: string, on: boolean) => void;
  onSetAll: (category: CategoryView, on: boolean) => void;
};

/**
 * One permission category: a header carrying the group's tint, its grant count
 * and the grant-all / revoke-all control, over a collapsible list of rows.
 *
 * Collapse state is local rather than lifted — nothing outside this card cares
 * which sections are open, and holding eight booleans in the page hook would buy
 * nothing. `forceExpanded` still wins over it, so a search can never hide a hit
 * inside a section the admin happened to close earlier.
 */
export default function PermissionCategorySection({
  category,
  granted,
  locked,
  pending,
  bulkBusy,
  forceExpanded,
  onToggle,
  onSetAll,
}: Props) {
  const [open, setOpen] = useState(true);
  const expanded = forceExpanded || open;
  const { accent } = category.category;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ p: { xs: 1.5, sm: 2 }, pb: 1.5 }}
      >
        <IconBadge accent={accent} size={36} iconSize={20}>
          <CategoryIcon categoryKey={category.category.key} />
        </IconBadge>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
              {category.category.label}
            </Typography>
            <Chip
              size="small"
              label={`${category.grantedCount}/${category.totalCount}`}
              color={category.grantedCount > 0 ? accent : 'default'}
              variant={category.allGranted ? 'filled' : 'outlined'}
              sx={{ height: 20, fontSize: 11, fontWeight: 600 }}
            />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {category.category.blurb}
          </Typography>
        </Box>

        <IconButton
          size="small"
          onClick={() => setOpen((v) => !v)}
          // Under a search the body is pinned open, so the chevron would be a
          // control that visibly does nothing.
          disabled={forceExpanded}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${category.category.label}`}
          sx={{
            flexShrink: 0,
            transition: 'transform 150ms',
            transform: expanded ? 'rotate(180deg)' : 'none',
          }}
        >
          <ExpandMoreIcon />
        </IconButton>
      </Stack>

      <Box sx={{ px: { xs: 1.5, sm: 2 }, pb: 1.5 }}>
        <GrantMeter
          granted={category.grantedCount}
          total={category.totalCount}
          accent={accent}
          hideCaption
        />
      </Box>

      <Collapse in={expanded} unmountOnExit>
        <Divider />
        <Box sx={{ px: { xs: 1, sm: 1.5 }, py: 0.5 }}>
          {category.permissions.map((permission) => (
            <PermissionRow
              key={permission.id}
              permission={permission}
              granted={granted.has(permission.id)}
              locked={locked}
              pending={pending.has(permission.id)}
              busy={bulkBusy}
              onToggle={onToggle}
            />
          ))}
        </Box>

        {!locked && (
          <>
            <Divider />
            <Stack
              direction="row"
              spacing={1}
              justifyContent="flex-end"
              sx={{ px: { xs: 1.5, sm: 2 }, py: 1 }}
            >
              {/* Bulk controls sit at the foot of the body, not the header:
                  they act on the whole category, so they should not be reachable
                  while its rows are collapsed out of sight. */}
              <Tooltip title="Revoke every permission in this category">
                <span>
                  <Button
                    size="small"
                    color="inherit"
                    disabled={category.noneGranted || bulkBusy}
                    onClick={() => onSetAll(category, false)}
                  >
                    Revoke all
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Grant every permission in this category">
                <span>
                  <Button
                    size="small"
                    color={accent}
                    disabled={category.allGranted || bulkBusy}
                    onClick={() => onSetAll(category, true)}
                  >
                    Grant all
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          </>
        )}
      </Collapse>
    </Paper>
  );
}
