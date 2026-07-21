import { Grid } from '@sinnapi/ui';
import BadgeIcon from '@mui/icons-material/Badge';
import ShieldIcon from '@mui/icons-material/Shield';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SummaryTile from '@/components/ui/SummaryTile';
import type { RbacSummaryCounts } from '../../hooks/useRbac';

type Props = {
  counts: RbacSummaryCounts;
  loading?: boolean;
  /** Name of the open role; softens the last tile's label when nothing is open. */
  selectedRoleName?: string;
};

/**
 * KPI bar above the editor. The first three tiles describe the catalog, the last
 * tracks the open role — it reads 0 with a generic label until one is selected,
 * rather than disappearing and reflowing the row.
 */
export default function RbacSummary({ counts, loading, selectedRoleName }: Props) {
  const tiles = [
    {
      label: 'Roles',
      value: counts.roles,
      icon: <BadgeIcon sx={{ color: 'white' }} />,
      accent: 'primary' as const,
    },
    {
      label: 'Admin roles',
      value: counts.adminRoles,
      icon: <ShieldIcon sx={{ color: 'white' }} />,
      accent: 'secondary' as const,
    },
    {
      label: 'Permissions',
      value: counts.permissions,
      icon: <VpnKeyIcon sx={{ color: 'white' }} />,
      accent: 'info' as const,
    },
    {
      label: selectedRoleName ? `Granted to ${selectedRoleName}` : 'Granted to selection',
      value: counts.grantedToSelection,
      icon: <CheckCircleIcon sx={{ color: 'white' }} />,
      accent: 'success' as const,
    },
  ];

  return (
    // Two per row on phones so the labels keep a readable width, four across
    // from `md` where the tiles have room to sit on one line.
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {tiles.map((t) => (
        <Grid key={t.label} item xs={6} md={3}>
          <SummaryTile {...t} loading={loading} />
        </Grid>
      ))}
    </Grid>
  );
}
