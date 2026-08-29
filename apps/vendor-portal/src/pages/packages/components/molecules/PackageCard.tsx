import { useState, type MouseEvent } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
  formatAmount,
  isPackagePublished,
  isPricingModel,
  packageFromPrice,
  packageTiers,
  PricingModelChip,
} from '@sinnapi/ui';
import { alpha } from '@mui/material/styles';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { PackageModel } from '@/lib/types';
import PackageStatusChip from '../atoms/PackageStatusChip';

type Props = {
  pkg: PackageModel;
  busy: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSetVisibility: (makePublic: boolean) => void;
};

/**
 * One package in the vendor's catalogue.
 *
 * Leads with the "from" price rather than the tier count, because that is the
 * figure the vendor is actually managing — "3 tiers" tells them nothing they
 * did not know when they made it.
 *
 * The publish control is a plain button rather than a switch. Publishing can be
 * refused by the server (an unpriced package is not allowed onto a public
 * profile), and a switch that flips back is a worse way to be told no than a
 * button that stays put and shows the reason.
 */
export default function PackageCard({
  pkg,
  busy,
  onEdit,
  onDuplicate,
  onDelete,
  onSetVisibility,
}: Props) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const tiers = packageTiers(pkg);
  const from = packageFromPrice(pkg);
  const published = isPackagePublished(pkg);
  const blocked = pkg.admin_unpublished_at != null;

  const openMenu = (event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget);
  const closeMenu = () => setAnchor(null);
  const pick = (action: () => void) => () => {
    closeMenu();
    action();
  };

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        overflow: 'hidden',
        // Archived packages are still readable, just visibly out of play.
        opacity: pkg.is_active === false ? 0.72 : 1,
      }}
    >
      {pkg.cover_image_url && (
        <Box
          component="img"
          src={pkg.cover_image_url}
          alt=""
          loading="lazy"
          sx={{
            width: '100%',
            aspectRatio: '16 / 7',
            objectFit: 'cover',
            bgcolor: (t) => alpha(t.palette.text.primary, 0.06),
          }}
        />
      )}

      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ lineHeight: 1.25 }}>
              {pkg.name}
            </Typography>
            {pkg.summary && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {pkg.summary}
              </Typography>
            )}
          </Box>
          <IconButton aria-label={`Actions for ${pkg.name}`} onClick={openMenu} size="small">
            <MoreVertIcon />
          </IconButton>
        </Stack>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <PackageStatusChip pkg={pkg} />
          <Chip
            size="small"
            variant="outlined"
            label={`${tiers.length} tier${tiers.length === 1 ? '' : 's'}`}
          />
          {/* Packages created before 0823c carry no model, and the next save
              will be refused until one is picked. Saying so on the card is the
              only place a vendor would find out before that refusal. */}
          {isPricingModel(pkg.pricing_model) ? (
            <PricingModelChip model={pkg.pricing_model} voice="vendor" />
          ) : (
            <Chip size="small" variant="outlined" color="warning" label="No charging method" />
          )}
        </Stack>

        <Box sx={{ flex: 1 }} />
        <Divider />

        <Stack direction="row" alignItems="flex-end" spacing={1}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">
              {from ? `From (${from.tierName})` : 'Not priced yet'}
            </Typography>
            {from && (
              <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
                {formatAmount(from.amount, from.currency)}
              </Typography>
            )}
          </Box>

          {busy ? (
            <CircularProgress size={20} sx={{ mb: 0.5 }} />
          ) : (
            <Button
              size="small"
              variant={published ? 'outlined' : 'contained'}
              disabled={blocked || pkg.is_active === false}
              onClick={() => onSetVisibility(!published)}
            >
              {published ? 'Unpublish' : 'Publish'}
            </Button>
          )}
        </Stack>
      </CardContent>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={closeMenu}>
        <MenuItem onClick={pick(onEdit)}>
          <EditOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={pick(onDuplicate)}>
          <ContentCopyIcon fontSize="small" sx={{ mr: 1.5 }} />
          Duplicate
        </MenuItem>
        <MenuItem onClick={pick(onDelete)} sx={{ color: 'error.main' }}>
          <DeleteOutlineIcon fontSize="small" sx={{ mr: 1.5 }} />
          Delete
        </MenuItem>
      </Menu>
    </Card>
  );
}
