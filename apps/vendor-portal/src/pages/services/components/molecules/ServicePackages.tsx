import { useState, type MouseEvent } from 'react';
import {
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
  formatAmount,
  isPackagePublished,
  packageFromPrice,
} from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import type { PackageModel } from '@/lib/types';
import PackageStatusChip from '@/pages/packages/components/atoms/PackageStatusChip';

export type PackageHandlers = {
  onAdd: () => void;
  onEdit: (pkg: PackageModel) => void;
  onSetVisibility: (pkg: PackageModel, show: boolean) => void;
  onDuplicate: (pkg: PackageModel) => void;
  onDelete: (pkg: PackageModel) => void;
  busyId: string | null;
};

function PackageRow({ pkg, h }: { pkg: PackageModel; h: PackageHandlers }) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const from = packageFromPrice(pkg);
  const showing = isPackagePublished(pkg);
  const blocked = pkg.admin_unpublished_at != null || pkg.is_active === false;
  const pick = (fn: () => void) => () => {
    setAnchor(null);
    fn();
  };

  return (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ py: 0.5 }}>
      <ButtonBase
        onClick={() => h.onEdit(pkg)}
        sx={{
          flex: 1,
          minWidth: 0,
          justifyContent: 'flex-start',
          textAlign: 'left',
          borderRadius: 1,
          py: 0.75,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={600} noWrap>
            {pkg.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {from ? `From ${formatAmount(from.amount, from.currency)}` : 'No price yet'}
          </Typography>
        </Box>
      </ButtonBase>
      {h.busyId === pkg.id ? <CircularProgress size={18} /> : <PackageStatusChip pkg={pkg} />}
      <IconButton
        aria-label={`More for ${pkg.name}`}
        onClick={(e: MouseEvent<HTMLElement>) => setAnchor(e.currentTarget)}
        size="small"
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <MenuItem onClick={pick(() => h.onEdit(pkg))}>Change</MenuItem>
        <MenuItem disabled={blocked} onClick={pick(() => h.onSetVisibility(pkg, !showing))}>
          {showing ? 'Hide from clients' : 'Show to clients'}
        </MenuItem>
        <MenuItem onClick={pick(() => h.onDuplicate(pkg))}>Make a copy</MenuItem>
        <MenuItem onClick={pick(() => h.onDelete(pkg))} sx={{ color: 'error.main' }}>
          Delete
        </MenuItem>
      </Menu>
    </Stack>
  );
}

/**
 * A service's prices, inside its card (Services and Packages merged,
 * 2026-11-17). Vendors had to learn that a service's price lives on a
 * "package" on another page; now the prices sit under the service with an
 * "Add a price" button right there.
 */
export default function ServicePackages({
  packages,
  h,
}: {
  packages: PackageModel[];
  h: PackageHandlers;
}) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>
        Prices
      </Typography>
      {packages.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ my: 0.5 }}>
          No price yet — clients cannot see what this costs.
        </Typography>
      ) : (
        <Box sx={{ '& > * + *': { borderTop: 1, borderColor: 'divider' } }}>
          {packages.map((p) => (
            <PackageRow key={p.id} pkg={p} h={h} />
          ))}
        </Box>
      )}
      <Button startIcon={<AddIcon />} onClick={h.onAdd} sx={{ mt: 0.5, minHeight: 44 }}>
        Add a price
      </Button>
    </Box>
  );
}
